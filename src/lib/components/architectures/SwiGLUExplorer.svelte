<script lang="ts">
  export let activeConfig: '8B' | '70B' = '8B';

  // --- TAB STATE ---
  type TabKey = 'two-paths' | 'follow-dim' | 'scale-llama' | 'why-silu';
  let activeTab: TabKey = 'two-paths';

  // Model parameters based on activeConfig
  $: dModel = activeConfig === '8B' ? 4096 : 8192;
  $: ffnHidden = activeConfig === '8B' ? 14336 : 28672;
  $: ffnMultiplier = activeConfig === '8B' ? 1.3 : 1.3; // Llama 3 defaults
  $: multipleOf = 256;

  // Exact Llama 3 computation steps:
  $: step1_4d = 4 * dModel;
  $: step2_twoThirds = Math.floor((2 * step1_4d) / 3);
  $: step3_multiplied = Math.floor(step2_twoThirds * ffnMultiplier);
  $: step4_rounded = multipleOf * Math.ceil(step3_multiplied / multipleOf);

  $: geluParamsM = (2 * dModel * (4 * dModel) / 1_000_000).toFixed(2);
  $: swigluParamsM = (3 * dModel * ffnHidden / 1_000_000).toFixed(2);

  // --- STAGE 1 & 2: TOY TOKEN DATA FLOW ---
  // Toy vector slice representing a single token: x in R^4
  let toyInput = [0.8, -0.3, 1.2, 0.5];

  // Pre-activation Gate logits (W_gate * x): z
  let gateLogits = [1.4, -0.8, 0.2, 1.7];

  // Up projection features (W_up * x): u
  let upFeatures = [2.0, 4.0, -1.0, 0.5];

  function silu(z: number): number {
    return z / (1 + Math.exp(-z));
  }

  // Interactive slider overrides for dimension 0
  let interactiveGateLogit = 1.4;
  let interactiveUpFeature = 2.0;

  $: activeZ0 = interactiveGateLogit;
  $: activeU0 = interactiveUpFeature;
  $: activeSiLU0 = silu(activeZ0);
  $: activeH0 = activeSiLU0 * activeU0;

  // Modulated dimensions
  $: modulatedGate = gateLogits.map((z, idx) => idx === 0 ? activeSiLU0 : silu(z));
  $: effectiveUp = upFeatures.map((u, idx) => idx === 0 ? activeU0 : u);
  $: hadamardResult = modulatedGate.map((g, idx) => g * effectiveUp[idx]);
  $: toyDownOutput = hadamardResult.map(h => Number((h * 0.75).toFixed(2))); // Simulated W_down mapping

  // --- STAGE 4: SILU EXPLORER PROBE ---
  let probeZ = -1.28;
  $: probeSiLU = silu(probeZ);
  $: probeSigmoid = 1 / (1 + Math.exp(-probeZ));

  // Heat color helper
  function heatColor(val: number): string {
    const clamped = Math.max(-2, Math.min(2, val));
    const norm = (clamped + 2) / 4;
    const r = Math.round(99 + (245 - 99) * norm);
    const g = Math.round(102 * (1 - Math.abs(norm - 0.5) * 2));
    const b = Math.round(241 * (1 - norm) + 115 * norm);
    return `rgb(${r},${g},${b})`;
  }
</script>

<div class="swiglu-explorer">
  <!-- NAVIGATION TABS -->
  <header class="tabs-nav">
    <button 
      class="tab-btn" 
      class:tab-active={activeTab === 'two-paths'} 
      on:click={() => activeTab = 'two-paths'}
    >
      <span class="tab-num">01</span>
      <span class="tab-title">Two Paths Architecture</span>
    </button>

    <button 
      class="tab-btn" 
      class:tab-active={activeTab === 'follow-dim'} 
      on:click={() => activeTab = 'follow-dim'}
    >
      <span class="tab-num">02</span>
      <span class="tab-title">Follow One Dimension</span>
    </button>

    <button 
      class="tab-btn" 
      class:tab-active={activeTab === 'scale-llama'} 
      on:click={() => activeTab = 'scale-llama'}
    >
      <span class="tab-num">03</span>
      <span class="tab-title">Scale to Llama (14,336-d)</span>
    </button>

    <button 
      class="tab-btn" 
      class:tab-active={activeTab === 'why-silu'} 
      on:click={() => activeTab = 'why-silu'}
    >
      <span class="tab-num">04</span>
      <span class="tab-title">Why SiLU? (Activation)</span>
    </button>
  </header>

  <!-- TAB CONTENT PANELS -->
  <div class="tab-panel">

    <!-- =======================================================
         STAGE 1: TWO PATHS (DUAL STREAM DATA FLOW)
         ======================================================= -->
    {#if activeTab === 'two-paths'}
      <div class="stage-view stage-two-paths">
        <div class="stage-header">
          <div class="badge">MECHANISM OVERVIEW</div>
          <h3>The Dual-Stream Multiplicative Gating Flow</h3>
          <p class="stage-desc">
            Both branches receive the <strong>exact same token representation $x$</strong>. One branch produces the raw feature signals, while the other applies a learned $\operatorname{SiLU}$ modulation before elementwise recombination.
          </p>
        </div>

        <!-- DUAL STREAM FLOWCHART SVG -->
        <div class="flowchart-container">
          <svg viewBox="0 0 680 440" class="flow-svg">
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--accent)" />
              </marker>
              <marker id="arr-gold" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 2 L 8 5 L 0 8 z" fill="var(--highlight)" />
              </marker>
            </defs>

            <!-- INPUT TOKEN BOX -->
            <rect x="240" y="10" width="200" height="46" rx="8" class="node-box input-box" />
            <text x="340" y="28" text-anchor="middle" class="node-label">SAME INPUT TOKEN x</text>
            <text x="340" y="45" text-anchor="middle" class="node-sub">[0.8, -0.3, 1.2, 0.5] · dim = {dModel}</text>

            <!-- SPLIT WIRES -->
            <path d="M 340 56 L 340 80 L 190 80 L 190 105" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#arr)" />
            <path d="M 340 56 L 340 80 L 490 80 L 490 105" fill="none" stroke="var(--highlight)" stroke-width="2" marker-end="url(#arr-gold)" />

            <!-- LEFT BRANCH: GATE -->
            <g transform="translate(90, 110)">
              <rect x="0" y="0" width="200" height="50" rx="8" class="node-box gate-box" />
              <text x="100" y="22" text-anchor="middle" class="node-label">Gate Projection (w1)</text>
              <text x="100" y="40" text-anchor="middle" class="node-sub">W_gate · x → [{ffnHidden}]</text>

              <line x1="100" y1="50" x2="100" y2="78" stroke="var(--accent)" stroke-width="2" marker-end="url(#arr)" />

              <rect x="25" y="80" width="150" height="42" rx="8" class="node-box silu-box" />
              <text x="100" y="100" text-anchor="middle" class="node-label">SiLU Non-Linearity</text>
              <text x="100" y="114" text-anchor="middle" class="node-sub">z · σ(z) ∈ (-0.28, ∞)</text>

              <path d="M 100 122 L 100 160 L 235 160" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#arr)" />
            </g>

            <!-- RIGHT BRANCH: UP -->
            <g transform="translate(390, 110)">
              <rect x="0" y="0" width="200" height="50" rx="8" class="node-box up-box" />
              <text x="100" y="22" text-anchor="middle" class="node-label">Up Projection (w3)</text>
              <text x="100" y="40" text-anchor="middle" class="node-sub">W_up · x → [{ffnHidden}]</text>

              <path d="M 100 50 L 100 160 L -35 160" fill="none" stroke="var(--highlight)" stroke-width="2" marker-end="url(#arr-gold)" />
            </g>

            <!-- ELEMENTWISE MULTIPLICATION CIRCLE -->
            <circle cx="340" cy="270" r="22" class="mult-node" />
            <text x="340" y="276" text-anchor="middle" class="mult-symbol">⊙</text>
            <text x="340" y="306" text-anchor="middle" class="hadamard-caption">Hadamard Product (elementwise ×)</text>

            <!-- DOWN PROJECTION -->
            <line x1="340" y1="314" x2="340" y2="340" stroke="var(--accent)" stroke-width="2" marker-end="url(#arr)" />

            <rect x="240" y="345" width="200" height="50" rx="8" class="node-box down-box" />
            <text x="340" y="367" text-anchor="middle" class="node-label">Down Projection (w2)</text>
            <text x="340" y="384" text-anchor="middle" class="node-sub">W_down · h → dim = {dModel}</text>

            <line x1="340" y1="395" x2="340" y2="425" stroke="var(--accent)" stroke-width="2" marker-end="url(#arr)" />
          </svg>
        </div>

        <div class="takeaway-banner">
          <span class="takeaway-icon">💡</span>
          <span><strong>Core Insight:</strong> Adds a learned multiplicative interaction between two parallel projections without requiring non-linearities in the Up branch.</span>
        </div>
      </div>

    <!-- =======================================================
         STAGE 2: FOLLOW ONE DIMENSION (INTERACTIVE GATING)
         ======================================================= -->
    {:else if activeTab === 'follow-dim'}
      <div class="stage-view stage-follow-dim">
        <div class="stage-header">
          <div class="badge">INTERACTIVE SANDBOX</div>
          <h3>Follow a Single Feature Dimension</h3>
          <p class="stage-desc">
            Vary the pre-activation gate logit $z_0$ and up-feature $u_0$ to observe how $\operatorname{SiLU}(z_0)$ modulates candidate content dimension-by-dimension.
          </p>
        </div>

        <div class="interactive-grid">
          <!-- CONTROLS COLUMN -->
          <div class="ctrl-card">
            <h4>Dimension #0 Modulation Controls</h4>

            <div class="slider-block">
              <div class="slider-header">
                <span>Gate Projection Logit ($z_0$):</span>
                <strong style="color: var(--accent)">{activeZ0.toFixed(2)}</strong>
              </div>
              <input type="range" min="-4.0" max="4.0" step="0.1" bind:value={interactiveGateLogit} class="blue-slider" />
              <div class="slider-sub">
                $\operatorname{SiLU}({activeZ0.toFixed(2)}) = \mathbf{{activeSiLU0.toFixed(2)}}$
              </div>
            </div>

            <div class="slider-block">
              <div class="slider-header">
                <span>Up Projection Feature ($u_0$):</span>
                <strong style="color: var(--highlight)">{activeU0.toFixed(2)}</strong>
              </div>
              <input type="range" min="-5.0" max="5.0" step="0.1" bind:value={interactiveUpFeature} class="hl-slider" />
              <div class="slider-sub">
                Candidate representation before gating
              </div>
            </div>

            <div class="gate-behaviors">
              <span class="sub-heading">Test Key Activation Behaviors:</span>
              <div class="chip-row">
                <button class="chip" on:click={() => { interactiveGateLogit = -3.0; interactiveUpFeature = 4.0; }}>Suppressed ($z = -3$)</button>
                <button class="chip" on:click={() => { interactiveGateLogit = -1.28; interactiveUpFeature = 3.0; }}>Negative Dip ($z = -1.28$)</button>
                <button class="chip" on:click={() => { interactiveGateLogit = 0.0; interactiveUpFeature = 5.0; }}>Zero Gate ($z = 0$)</button>
                <button class="chip" on:click={() => { interactiveGateLogit = 2.5; interactiveUpFeature = 3.0; }}>Amplified ($z = 2.5$)</button>
              </div>
            </div>
          </div>

          <!-- VECTOR ALIGNMENT VISUALIZER -->
          <div class="vector-math-card">
            <h4>Coordinate-by-Coordinate Hadamard Product ($\odot$)</h4>

            <div class="math-flow-columns">
              <!-- GATE COLUMN -->
              <div class="math-col">
                <span class="col-tag">SiLU(Gate)</span>
                {#each modulatedGate as g, i}
                  <div class="vec-cell" class:highlight-cell={i === 0} style="border-left: 3px solid var(--accent)">
                    <span class="cell-idx">d{i}</span>
                    <strong class="cell-val" style="color: var(--accent)">{g.toFixed(2)}</strong>
                  </div>
                {/each}
              </div>

              <!-- MULTIPLY OPERATOR -->
              <div class="math-col-op">
                <span class="op-tag"></span>
                {#each Array(4) as _}
                  <div class="op-cell">⊙</div>
                {/each}
              </div>

              <!-- UP COLUMN -->
              <div class="math-col">
                <span class="col-tag">Up Feature (w3)</span>
                {#each effectiveUp as u, i}
                  <div class="vec-cell" class:highlight-cell={i === 0} style="border-left: 3px solid var(--highlight)">
                    <span class="cell-idx">d{i}</span>
                    <strong class="cell-val" style="color: var(--highlight)">{u.toFixed(2)}</strong>
                  </div>
                {/each}
              </div>

              <!-- EQUALS OPERATOR -->
              <div class="math-col-op">
                <span class="op-tag"></span>
                {#each Array(4) as _}
                  <div class="op-cell">=</div>
                {/each}
              </div>

              <!-- RESULT COLUMN -->
              <div class="math-col">
                <span class="col-tag">Modulated Output (h)</span>
                {#each hadamardResult as res, i}
                  <div class="vec-cell" class:highlight-cell={i === 0} style="background: rgba(99, 102, 241, 0.12)">
                    <span class="cell-idx">d{i}</span>
                    <strong class="cell-val" style="color: var(--text)">{res.toFixed(2)}</strong>
                  </div>
                {/each}
              </div>
            </div>

            <!-- RESULT HIGHLIGHT -->
            <div class="dim0-equation-box">
              <span>Dimension #0 Real-Time Output:</span>
              <code>{activeSiLU0.toFixed(2)} (Gate) × {activeU0.toFixed(2)} (Up) = <strong style="color: var(--accent)">{activeH0.toFixed(2)}</strong></code>
            </div>
          </div>
        </div>
      </div>

    <!-- =======================================================
         STAGE 3: SCALE TO LLAMA (14,336-D ARITHMETIC)
         ======================================================= -->
    {:else if activeTab === 'scale-llama'}
      <div class="stage-view stage-scale-llama">
        <div class="stage-header">
          <div class="badge">SHAPE & BUDGET DERIVATION</div>
          <h3>Deriving the Llama 3 Intermediate Dimension (14,336)</h3>
          <p class="stage-desc">
            Why doesn't Llama 3 use a simple $4d$ ($16,384$) expansion? Step through the exact computation in Meta's <code>model.py</code>.
          </p>
        </div>

        <div class="derivation-pipeline">
          <div class="calc-step">
            <span class="step-lbl">1. Model Dimension</span>
            <div class="step-val">d = {dModel}</div>
            <p class="step-sub">Base residual stream width</p>
          </div>

          <div class="calc-arrow">× 4 ➔</div>

          <div class="calc-step">
            <span class="step-lbl">2. Standard FFN Hidden</span>
            <div class="step-val">{step1_4d.toLocaleString()}</div>
            <p class="step-sub">Standard 4d baseline</p>
          </div>

          <div class="calc-arrow">× 2/3 ➔</div>

          <div class="calc-step">
            <span class="step-lbl">3. Shazeer 2/3 Reduction</span>
            <div class="step-val">{step2_twoThirds.toLocaleString()}</div>
            <p class="step-sub">Normalizes 3-matrix parameter count</p>
          </div>

          <div class="calc-arrow">× 1.3 ➔</div>

          <div class="calc-step">
            <span class="step-lbl">4. ffn_dim_multiplier</span>
            <div class="step-val">{step3_multiplied.toLocaleString()}</div>
            <p class="step-sub">Meta capacity expansion factor</p>
          </div>

          <div class="calc-arrow">Round 256 ➔</div>

          <div class="calc-step highlight-step">
            <span class="step-lbl">5. Hardware Multiple</span>
            <div class="step-val" style="color: var(--accent)">{step4_rounded.toLocaleString()}</div>
            <p class="step-sub">Optimized for Tensor Core GEMM tiles</p>
          </div>
        </div>

        <!-- PARAMETER COMPARISON -->
        <div class="budget-comparison-box">
          <h4>Parameter & Weight Footprint (Per Layer)</h4>
          <div class="budget-columns">
            <div class="budget-card">
              <div class="b-head">Standard GELU FFN (2 Matrices)</div>
              <div class="b-math">2 × ({dModel} × {step1_4d})</div>
              <div class="b-total">≈ {geluParamsM}M weights</div>
              <div class="b-note">Single un-gated projection path with 16,384 intermediate dimension.</div>
            </div>

            <div class="budget-card active-b-card">
              <div class="b-head">Llama 3 SwiGLU FFN (3 Matrices)</div>
              <div class="b-math">3 × ({dModel} × {ffnHidden})</div>
              <div class="b-total" style="color: var(--accent)">≈ {swigluParamsM}M weights</div>
              <div class="b-note">The $2/3$ rule keeps theoretical GLU parameter counts comparable before the $1.3\times$ capacity multiplier and multiple-of-256 rounding.</div>
            </div>
          </div>
        </div>
      </div>

    <!-- =======================================================
         STAGE 4: WHY SILU? (ACTIVATION EXPLORER)
         ======================================================= -->
    {:else if activeTab === 'why-silu'}
      <div class="stage-view stage-why-silu">
        <div class="stage-header">
          <div class="badge">ACTIVATION DYNAMICS</div>
          <h3>Why $\operatorname{SiLU}(z) = z \cdot \sigma(z)$ Isn't Just a [0, 1] Switch</h3>
          <p class="stage-desc">
            Unlike classical Sigmoid gates which compress values strictly into $[0, 1]$, $\operatorname{SiLU}$ is smooth, non-monotonic, self-gated, and allows subtle negative modulation.
          </p>
        </div>

        <div class="silu-interactive-layout">
          <!-- PROBE CONTROLS -->
          <div class="silu-probe-card">
            <div class="slider-block">
              <div class="slider-header">
                <span>Test Input ($z$):</span>
                <strong style="color: var(--accent)">{probeZ.toFixed(2)}</strong>
              </div>
              <input type="range" min="-4.0" max="4.0" step="0.05" bind:value={probeZ} class="blue-slider" />
            </div>

            <div class="probe-metrics">
              <div class="metric-row">
                <span>SiLU Output ($z \cdot \sigma(z)$):</span>
                <strong style="color: var(--accent)">{probeSiLU.toFixed(3)}</strong>
              </div>
              <div class="metric-row">
                <span>Standard Sigmoid ($\sigma(z)$):</span>
                <strong style="color: var(--muted)">{probeSigmoid.toFixed(3)}</strong>
              </div>
            </div>

            <div class="silu-key-properties">
              <h5>Key Properties of $\operatorname{SiLU}$:</h5>
              <ul>
                <li><strong>Negative Valley:</strong> Reaches minimum $\approx -0.278$ at $z \approx -1.28$.</li>
                <li><strong>Non-Saturating:</strong> For large positive $z$, $\operatorname{SiLU}(z) \approx z$ (unbounded).</li>
                <li><strong>Zero Pivot:</strong> $\operatorname{SiLU}(0) = 0$.</li>
              </ul>
            </div>
          </div>

          <!-- SVG GRAPH OF SILU VS SIGMOID -->
          <div class="silu-graph-card">
            <svg viewBox="0 0 320 220" class="graph-svg">
              <!-- Axes -->
              <line x1="20" y1="140" x2="300" y2="140" stroke="var(--border)" stroke-width="1.5" />
              <line x1="160" y1="20" x2="160" y2="200" stroke="var(--border)" stroke-width="1.5" />

              <text x="295" y="155" class="graph-axis-lbl">z</text>
              <text x="165" y="30" class="graph-axis-lbl">y</text>

              <!-- Grid markers -->
              <text x="160" y="155" text-anchor="middle" class="graph-axis-lbl">0</text>
              <text x="260" y="155" text-anchor="middle" class="graph-axis-lbl">+3</text>
              <text x="60" y="155" text-anchor="middle" class="graph-axis-lbl">-3</text>

              <!-- Sigmoid Curve (Dashed) -->
              <path 
                d="M 20 190 Q 110 185 160 160 T 300 142" 
                fill="none" 
                stroke="var(--muted)" 
                stroke-dasharray="3,3" 
                stroke-width="1.5" 
              />

              <!-- SiLU Curve -->
              <!-- z from -4 to +4, mapped: svgX = 160 + z * 33.3, svgY = 140 - silu(z) * 33.3 -->
              <path 
                d="M 27 141 Q 80 144 117 149 Q 140 148 160 140 Q 200 115 293 45" 
                fill="none" 
                stroke="var(--accent)" 
                stroke-width="2.5" 
              />

              <!-- Interactive Point Probe -->
              {@const probeSvgX = 160 + probeZ * 33.3}
              {@const probeSvgY = 140 - probeSiLU * 33.3}
              <circle cx={probeSvgX} cy={probeSvgY} r="5" fill="var(--highlight)" />
              <line x1={probeSvgX} y1="140" x2={probeSvgX} y2={probeSvgY} stroke="var(--highlight)" stroke-dasharray="2,2" />
            </svg>

            <div class="legend-row">
              <span class="leg-item"><span class="leg-line silu-line"></span> SiLU(z)</span>
              <span class="leg-item"><span class="leg-line sig-line"></span> Sigmoid(z)</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

  </div>
</div>

<style>
  .swiglu-explorer { display: flex; flex-direction: column; width: 100%; gap: 1.5rem; }
  
  /* TABS */
  .tabs-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; background: var(--bg); padding: 0.4rem; border-radius: 10px; border: 1px solid var(--border); }
  .tab-btn { background: transparent; border: none; border-radius: 6px; padding: 0.65rem 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; transition: all 0.2s; }
  .tab-btn:hover { background: var(--surface2); }
  .tab-active { background: var(--surface2) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border); }
  .tab-num { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--accent); font-weight: 700; }
  .tab-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem; font-weight: 600; color: var(--text); }
  
  .tab-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.75rem; min-height: 480px; }
  
  .stage-header { margin-bottom: 1.5rem; }
  .badge { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700; color: var(--accent); letter-spacing: 0.05em; margin-bottom: 0.25rem; }
  .stage-header h3 { font-size: 1.3rem; margin: 0 0 0.5rem 0; color: var(--text); font-weight: 700; }
  .stage-desc { color: var(--muted); font-size: 0.88rem; line-height: 1.5; margin: 0; }
  
  /* FLOWCHART */
  .flowchart-container { display: flex; justify-content: center; width: 100%; margin: 1rem 0; }
  .flow-svg { width: 100%; max-width: 660px; height: auto; overflow: visible; }
  .node-box { stroke-width: 1.5; fill: var(--surface2); stroke: var(--border); }
  .input-box { stroke: var(--accent); fill: rgba(99, 102, 241, 0.08); }
  .gate-box { stroke: var(--accent); }
  .silu-box { stroke: var(--accent); stroke-dasharray: 4,3; }
  .up-box { stroke: var(--highlight); }
  .down-box { stroke: var(--accent); fill: rgba(99, 102, 241, 0.08); }
  .mult-node { fill: var(--surface2); stroke: var(--accent); stroke-width: 2; }
  .mult-symbol { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; fill: var(--accent); }
  .node-label { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 13px; fill: var(--text); }
  .node-sub { font-family: 'JetBrains Mono', monospace; font-size: 11px; fill: var(--muted); }
  .hadamard-caption { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: var(--muted); }

  .takeaway-banner { display: flex; align-items: center; gap: 0.75rem; background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 0.85rem 1.25rem; border-radius: 6px; font-size: 0.85rem; color: var(--text); margin-top: 1rem; }
  .takeaway-icon { font-size: 1.1rem; }

  /* FOLLOW ONE DIMENSION */
  .interactive-grid { display: flex; gap: 2rem; flex-wrap: wrap; }
  .ctrl-card { flex: 1; min-width: 300px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .ctrl-card h4, .vector-math-card h4 { font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text); }
  .slider-block { display: flex; flex-direction: column; gap: 0.4rem; }
  .slider-header { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
  .slider-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); font-style: italic; }
  .hl-slider { accent-color: var(--highlight); cursor: pointer; }
  .blue-slider { accent-color: var(--accent); cursor: pointer; }
  
  .gate-behaviors { display: flex; flex-direction: column; gap: 0.5rem; }
  .sub-heading { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
  .chip-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .chip { background: var(--bg); border: 1px solid var(--border); color: var(--muted); padding: 0.3rem 0.6rem; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; cursor: pointer; transition: all 0.2s; }
  .chip:hover { border-color: var(--text); color: var(--text); }

  .vector-math-card { flex: 1.4; min-width: 340px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  .math-flow-columns { display: grid; grid-template-columns: 1fr 24px 1fr 24px 1fr; gap: 0.5rem; align-items: center; }
  .math-col { display: flex; flex-direction: column; gap: 0.5rem; }
  .col-tag { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); text-align: center; white-space: nowrap; }
  .vec-cell { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
  .highlight-cell { border-color: var(--accent) !important; background: rgba(99, 102, 241, 0.1) !important; }
  .cell-idx { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }
  .cell-val { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
  .math-col-op { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
  .op-cell { height: 35px; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--muted); font-weight: 700; }
  .dim0-equation-box { background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 0.75rem 1rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }

  /* SCALE TO LLAMA */
  .derivation-pipeline { display: flex; align-items: center; gap: 0.75rem; overflow-x: auto; padding: 1rem 0; }
  .calc-step { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; min-width: 140px; }
  .highlight-step { border-color: var(--accent); background: rgba(99, 102, 241, 0.08); }
  .step-lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }
  .step-val { font-family: 'JetBrains Mono', monospace; font-size: 1.15rem; font-weight: 700; color: var(--text); }
  .step-sub { font-size: 0.68rem; color: var(--muted); margin: 0; line-height: 1.3; }
  .calc-arrow { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--accent); font-weight: 700; white-space: nowrap; }

  .budget-comparison-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; margin-top: 1.5rem; }
  .budget-comparison-box h4 { margin: 0 0 1rem 0; font-size: 0.95rem; }
  .budget-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .budget-card { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .active-b-card { border-color: var(--accent); }
  .b-head { font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; font-weight: 700; color: var(--text); }
  .b-math { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--muted); }
  .b-total { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 700; }
  .b-note { font-size: 0.72rem; color: var(--muted); line-height: 1.4; margin-top: 0.25rem; }

  /* WHY SILU */
  .silu-interactive-layout { display: flex; gap: 2rem; flex-wrap: wrap; }
  .silu-probe-card { flex: 1; min-width: 300px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  .probe-metrics { display: flex; flex-direction: column; gap: 0.5rem; background: var(--bg); border: 1px solid var(--border); padding: 0.75rem; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; }
  .metric-row { display: flex; justify-content: space-between; }
  .silu-key-properties h5 { margin: 0 0 0.5rem 0; font-size: 0.8rem; font-weight: 700; color: var(--text); }
  .silu-key-properties ul { margin: 0; padding-left: 1.2rem; font-size: 0.75rem; color: var(--muted); line-height: 1.6; }

  .silu-graph-card { flex: 1.2; min-width: 320px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
  .graph-svg { width: 100%; max-width: 320px; height: auto; }
  .graph-axis-lbl { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: var(--muted); }
  .legend-row { display: flex; gap: 1.5rem; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--muted); }
  .leg-item { display: flex; align-items: center; gap: 0.4rem; }
  .leg-line { width: 16px; height: 3px; border-radius: 2px; }
  .silu-line { background: var(--accent); }
  .sig-line { background: var(--muted); border-bottom: 1px dashed var(--muted); }

  @media (max-width: 768px) {
    .tabs-nav { grid-template-columns: 1fr 1fr; }
    .budget-columns { grid-template-columns: 1fr; }
  }
</style>