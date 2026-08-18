<script lang="ts">
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';

  let activeTab = 1;

  // --- TAB 2: FOLLOW ONE DIMENSION STATE ---
  let gateLogit = 1.5;
  let upFeature = 4.0;
  
  function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }
  function silu(x: number) { return x * sigmoid(x); }
  
  $: siluVal = silu(gateLogit);
  $: tab2Result = siluVal * upFeature;

  // --- TAB 3: LLAMA SCALE STATE ---
  const d_model = 4096;
  const multiple_of = 256;
  const ffn_dim_multiplier = 1.3;
  
  // Reproducing python's int() truncation
  const step1 = d_model * 4; // 16384
  const step2 = Math.trunc(step1 * (2/3)); // 10922
  const step3 = Math.trunc(step2 * ffn_dim_multiplier); // 14198
  const step4 = multiple_of * Math.ceil(step3 / multiple_of); // 14336

  // Parameter math
  const paramStandard = 2 * d_model * step1; // 134,217,728
  const paramSwiGLU = 3 * d_model * step4;   // 176,160,768

  // --- TAB 4: SILU GRAPH STATE ---
  let siluZ = -1.28;
  $: siluY = silu(siluZ);

  // Graph SVG generators
  // Domain: x from -4 to 4, Range: y from -1.5 to 3.5
  function scaleX(x: number) { return (x + 4) * (400 / 8); }
  function scaleY(y: number) { return 300 - (y + 1.5) * (300 / 5); }
  
  const siluPoints = Array.from({ length: 81 }, (_, i) => {
    const x = -4 + i * 0.1;
    return `${scaleX(x)},${scaleY(silu(x))}`;
  }).join(' ');

</script>

<InteractiveCard title="Micro: SwiGLU Feed-Forward Network" subtitle="Adds a learned multiplicative interaction between two projections. Replaces plain GELU FFNs by computing two parallel branches over the same token and combining them.">
  <div class="swiglu-explorer">
    
    <!-- TABS HEADER -->
    <div class="tabs-header">
      <button class="tab-btn" class:active={activeTab === 1} on:click={() => activeTab = 1}>01 - Two Paths</button>
      <button class="tab-btn" class:active={activeTab === 2} on:click={() => activeTab = 2}>02 - Follow One Dimension</button>
      <button class="tab-btn" class:active={activeTab === 3} on:click={() => activeTab = 3}>03 - Scale to Llama</button>
      <button class="tab-btn" class:active={activeTab === 4} on:click={() => activeTab = 4}>04 - Why SiLU?</button>
    </div>

    <div class="tab-content">
      
      <!-- TAB 1: TWO PATHS -->
      {#if activeTab === 1}
        <div class="stage-wrapper tab1">
          <div class="flow-diagram">
            <div class="flow-node highlight-box">
              <span class="micro-label">SAME INPUT</span>
              <span class="code-font">x [4096]</span>
            </div>
            
            <div class="split-lines">
              <svg viewBox="0 0 200 40" preserveAspectRatio="none" style="width: 100%; height: 40px; stroke: var(--border); stroke-width: 2; fill: none;">
                <path d="M 100 0 L 100 20 L 20 20 L 20 40" />
                <path d="M 100 0 L 100 20 L 180 20 L 180 40" />
              </svg>
            </div>

            <div class="branches">
              <div class="branch">
                <div class="flow-box">
                  <strong>W_gate</strong>
                  <span class="dim">14336 × 4096</span>
                </div>
                <div class="arrow">↓</div>
                <div class="flow-box"><strong>SiLU</strong></div>
              </div>
              <div class="branch">
                <div class="flow-box">
                  <strong>W_up</strong>
                  <span class="dim">14336 × 4096</span>
                </div>
                <div class="arrow">↓</div>
                <div class="flow-box ghost"><em>(no activation)</em></div>
              </div>
            </div>

            <div class="merge-section">
              <div class="merge-lines">
                <svg viewBox="0 0 200 40" preserveAspectRatio="none" style="width: 100%; height: 40px; stroke: var(--border); stroke-width: 2; fill: none;">
                  <path d="M 20 0 L 20 20 L 100 20 L 100 40" />
                  <path d="M 180 0 L 180 20 L 100 20 L 100 40" />
                </svg>
              </div>
              <div class="op-node">
                <span class="op-sym">⊙</span>
                <span class="micro-label">Hadamard Product / Elementwise ×</span>
              </div>
            </div>

            <div class="arrow">↓</div>
            <div class="flow-box">
              <strong>W_down</strong>
              <span class="dim">4096 × 14336</span>
            </div>
            <div class="arrow">↓</div>
            <div class="flow-node">
              <span class="code-font">output [4096]</span>
            </div>
          </div>
        </div>

      <!-- TAB 2: FOLLOW ONE DIMENSION -->
      {:else if activeTab === 2}
        <div class="stage-wrapper tab2">
          <div class="sandbox-container">
            <div class="sandbox-header">
              <h3>Follow One Feature Dimension</h3>
              <p>Observe how the gate branch modulates the up feature.</p>
            </div>

            <div class="sandbox-branches">
              <!-- GATE BRANCH -->
              <div class="sandbox-branch">
                <div class="ctrl-group">
                  <div class="lbl-row">
                    <span>Gate Logit ($z_0$)</span>
                    <strong style="color: var(--highlight)">{gateLogit.toFixed(2)}</strong>
                  </div>
                  <input type="range" min="-4" max="4" step="0.1" bind:value={gateLogit} class="slider-gate" />
                </div>
                <div class="arrow">↓</div>
                <div class="math-box">SiLU({gateLogit.toFixed(2)})</div>
                <div class="arrow">↓</div>
                <div class="result-box gate-res">
                  <span class="lbl">Modulation</span>
                  <strong>{siluVal.toFixed(3)}</strong>
                </div>
              </div>

              <!-- ELEMENTWISE MULT -->
              <div class="sandbox-operator">
                <div class="op-sym">×</div>
              </div>

              <!-- UP BRANCH -->
              <div class="sandbox-branch">
                <div class="ctrl-group">
                  <div class="lbl-row">
                    <span>Up Feature ($u_0$)</span>
                    <strong style="color: var(--blue)">{upFeature.toFixed(2)}</strong>
                  </div>
                  <input type="range" min="-5" max="5" step="0.1" bind:value={upFeature} class="slider-up" />
                </div>
                <div class="arrow">↓</div>
                <div class="math-box ghost"><em>raw feature</em></div>
                <div class="arrow">↓</div>
                <div class="result-box up-res">
                  <span class="lbl">Content</span>
                  <strong>{upFeature.toFixed(3)}</strong>
                </div>
              </div>
            </div>

            <div class="sandbox-final">
              <div class="arrow">↓</div>
              <div class="result-box final-res">
                <span class="lbl">Intermediate Result</span>
                <strong>{tab2Result.toFixed(3)}</strong>
              </div>
            </div>
          </div>
        </div>

      <!-- TAB 3: SCALE TO LLAMA -->
      {:else if activeTab === 3}
        <div class="stage-wrapper tab3">
          <div class="derivation-grid">
            <div class="math-derivation">
              <h3>Llama 3 FFN Dimension Derivation</h3>
              <div class="calc-steps">
                <div class="step"><span class="lbl">Model dimension ($d$)</span><strong class="val">{d_model}</strong></div>
                <div class="step op"><span class="lbl">× 4 (Standard FFN ratio)</span><strong class="val">{step1}</strong></div>
                <div class="step op"><span class="lbl">× 2/3 (SwiGLU budget shrink)</span><strong class="val">{step2}</strong></div>
                <div class="step op"><span class="lbl">× 1.3 (Llama 3 multiplier)</span><strong class="val">{step3}</strong></div>
                <div class="step result-step"><span class="lbl">Round to multiple of 256</span><strong class="val">{step4}</strong></div>
              </div>
            </div>

            <div class="param-budget">
              <h3>Parameter Budget Comparison</h3>
              <p class="budget-note">The 2/3 rule theoretically keeps a GLU variant comparable to a 4d standard FFN. However, Llama's actual configuration uses a 1.3x multiplier, resulting in more parameters than strict parity.</p>
              
              <div class="budget-card">
                <span class="budget-title">Standard 4d FFN (2 matrices)</span>
                <code>2 × {d_model} × {step1}</code>
                <strong class="total">≈ {(paramStandard / 1e6).toFixed(2)}M weights</strong>
              </div>
              
              <div class="budget-card active-budget">
                <span class="budget-title">Llama 3 SwiGLU (3 matrices)</span>
                <code>3 × {d_model} × {step4}</code>
                <strong class="total" style="color: var(--accent)">≈ {(paramSwiGLU / 1e6).toFixed(2)}M weights</strong>
              </div>
            </div>
          </div>
        </div>

      <!-- TAB 4: WHY SILU? -->
      {:else if activeTab === 4}
        <div class="stage-wrapper tab4">
          <div class="silu-graph-container">
            <div class="silu-sidebar">
              <h3>Why SiLU?</h3>
              <p>The original GLU used a Sigmoid function, which strictly bounds the gate between <code>[0, 1]</code>.</p>
              <p>SwiGLU replaces it with <strong>SiLU ($z \cdot \sigma(z)$)</strong>. It is not restricted to <code>[0, 1]</code>. It can be negative (pushing features in the opposite direction) and grows linearly for large values.</p>
              
              <div class="ctrl-group">
                <div class="lbl-row">
                  <span>Input ($z$)</span>
                  <strong style="color: var(--highlight)">{siluZ.toFixed(2)}</strong>
                </div>
                <input type="range" min="-4" max="4" step="0.1" bind:value={siluZ} class="slider-gate" />
              </div>
              
              <div class="readout">
                <span>SiLU Output:</span>
                <strong>{siluY.toFixed(3)}</strong>
              </div>
            </div>

            <div class="svg-graph">
              <svg viewBox="0 0 400 300" class="graph-svg">
                <!-- Grid Lines -->
                <line x1="0" y1={scaleY(0)} x2="400" y2={scaleY(0)} class="axis" />
                <line x1={scaleX(0)} y1="0" x2={scaleX(0)} y2="300" class="axis" />
                
                <!-- Axis Labels -->
                <text x={scaleX(0) + 10} y={scaleY(0) + 15} class="tick-lbl">0</text>
                <text x={scaleX(1)} y={scaleY(0) + 15} class="tick-lbl">1</text>
                <text x={scaleX(-1)} y={scaleY(0) + 15} class="tick-lbl">-1</text>
                <text x={scaleX(0) + 10} y={scaleY(1)} class="tick-lbl">1</text>

                <!-- SiLU Curve -->
                <polyline points={siluPoints} fill="none" stroke="var(--highlight)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                
                <!-- Interactive Point -->
                <line x1={scaleX(siluZ)} y1={scaleY(0)} x2={scaleX(siluZ)} y2={scaleY(siluY)} stroke="var(--muted)" stroke-dasharray="4,4" />
                <line x1={scaleX(0)} y1={scaleY(siluY)} x2={scaleX(siluZ)} y2={scaleY(siluY)} stroke="var(--muted)" stroke-dasharray="4,4" />
                <circle cx={scaleX(siluZ)} cy={scaleY(siluY)} r="6" fill="var(--accent)" />
              </svg>
            </div>
          </div>
        </div>
      {/if}

    </div>
  </div>
</InteractiveCard>

<style>
  .swiglu-explorer { display: flex; flex-direction: column; width: 100%; }
  
  .tabs-header { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 2rem; overflow-x: auto; }
  .tab-btn { background: none; border: none; padding: 1rem 1.5rem; font-family: 'Space Grotesk', sans-serif; font-weight: 600; color: var(--muted); cursor: pointer; transition: all 0.2s; border-bottom: 2px solid transparent; white-space: nowrap; }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

  .stage-wrapper { animation: fadeIn 0.3s ease-out; width: 100%; display: flex; justify-content: center; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

  .arrow { color: var(--muted); font-size: 1.25rem; margin: 0.5rem 0; text-align: center; }
  .code-font { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 700; color: var(--text); }
  .micro-label { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; display: block; }
  
  /* TAB 1 */
  .flow-diagram { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 500px; }
  .flow-node { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1.5rem; text-align: center; }
  .highlight-box { border-color: var(--accent); box-shadow: 0 0 15px rgba(99,102,241,0.1); }
  .split-lines, .merge-lines { width: 60%; height: 40px; }
  .branches { display: flex; width: 100%; justify-content: space-between; gap: 2rem; }
  .branch { flex: 1; display: flex; flex-direction: column; align-items: center; }
  .flow-box { background: var(--surface2); border: 1px solid var(--border); padding: 0.75rem 1rem; border-radius: 6px; text-align: center; width: 100%; max-width: 200px; display: flex; flex-direction: column; gap: 4px; }
  .flow-box strong { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; color: var(--text); }
  .flow-box .dim { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); }
  .flow-box.ghost { opacity: 0.6; font-style: italic; background: var(--bg); border-style: dashed; }
  .merge-section { display: flex; flex-direction: column; align-items: center; width: 100%; }
  .op-node { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
  .op-sym { background: var(--surface); border: 2px solid var(--accent); color: var(--accent); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 1.5rem; font-family: 'JetBrains Mono', monospace; font-weight: 700; }

  /* TAB 2 */
  .sandbox-container { display: flex; flex-direction: column; width: 100%; max-width: 600px; align-items: center; }
  .sandbox-header { text-align: center; margin-bottom: 2rem; }
  .sandbox-header h3 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem 0; color: var(--text); }
  .sandbox-header p { font-size: 0.9rem; color: var(--muted); margin: 0; }
  
  .sandbox-branches { display: flex; width: 100%; justify-content: space-between; align-items: stretch; gap: 1rem; }
  .sandbox-branch { flex: 1; display: flex; flex-direction: column; align-items: center; background: var(--surface2); border: 1px solid var(--border); padding: 1.5rem; border-radius: 12px; }
  .sandbox-operator { display: flex; align-items: center; justify-content: center; }
  .sandbox-operator .op-sym { font-size: 2rem; color: var(--accent); font-family: 'JetBrains Mono', monospace; }
  
  .ctrl-group { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
  .lbl-row { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
  .slider-gate { accent-color: var(--highlight); }
  .slider-up { accent-color: var(--blue); }
  
  .math-box { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; font-weight: 700; background: var(--bg); border: 1px solid var(--border); padding: 0.5rem 1rem; border-radius: 4px; width: 100%; text-align: center; }
  .math-box.ghost { opacity: 0.5; border-style: dashed; }
  
  .result-box { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; background: var(--bg); border: 1px solid var(--border); padding: 0.75rem; border-radius: 6px; width: 100%; }
  .result-box .lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); text-transform: uppercase; }
  .result-box strong { font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; }
  .gate-res strong { color: var(--highlight); }
  .up-res strong { color: var(--blue); }
  
  .sandbox-final { width: 100%; display: flex; flex-direction: column; align-items: center; margin-top: 1rem; }
  .final-res { max-width: 300px; border-color: var(--accent); background: rgba(99,102,241,0.05); }
  .final-res strong { color: var(--text); }

  /* TAB 3 */
  .derivation-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; width: 100%; }
  @media (max-width: 800px) { .derivation-grid { grid-template-columns: 1fr; } }
  
  .math-derivation h3, .param-budget h3 { font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0; color: var(--text); }
  .budget-note { font-size: 0.9rem; color: var(--muted); line-height: 1.5; margin-bottom: 1.5rem; }
  
  .calc-steps { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 8px; background: var(--surface2); overflow: hidden; }
  .step { display: flex; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; }
  .step:last-child { border-bottom: none; }
  .step .lbl { color: var(--muted); }
  .step .val { color: var(--text); font-weight: 700; }
  .step.op .lbl::before { content: '↳ '; color: var(--highlight); }
  .result-step { background: rgba(99,102,241,0.1); }
  .result-step .val { color: var(--accent); font-size: 1rem; }
  
  .param-budget { display: flex; flex-direction: column; gap: 1rem; }
  .budget-card { display: flex; flex-direction: column; gap: 0.5rem; padding: 1.25rem; border: 1px solid var(--border); background: var(--surface2); border-radius: 8px; }
  .active-budget { border-color: var(--accent); border-left: 4px solid var(--accent); }
  .budget-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; font-weight: 700; color: var(--text); }
  .budget-card code { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); }
  .budget-card .total { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; }

  /* TAB 4 */
  .silu-graph-container { display: flex; gap: 3rem; width: 100%; align-items: center; justify-content: center; }
  @media (max-width: 700px) { .silu-graph-container { flex-direction: column; } }
  .silu-sidebar { flex: 1; max-width: 350px; display: flex; flex-direction: column; gap: 1.25rem; }
  .silu-sidebar h3 { font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text); }
  .silu-sidebar p { font-size: 0.9rem; color: var(--text); opacity: 0.85; margin: 0; line-height: 1.5; }
  .readout { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; background: var(--bg); border: 1px solid var(--border); padding: 0.75rem; border-radius: 6px; }
  .readout strong { color: var(--accent); font-size: 1.1rem; }
  
  .svg-graph { flex: 1; max-width: 400px; background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; display: flex; align-items: center; justify-content: center; }
  .graph-svg { width: 100%; height: auto; }
  .axis { stroke: var(--border); stroke-width: 2; }
  .tick-lbl { fill: var(--muted); font-family: 'JetBrains Mono', monospace; font-size: 10px; }
</style>