<script lang="ts">
  import InteractiveCard from '$lib/components/common/InteractiveCard.svelte';

  let activeTab = 1;

  // ==========================================
  // TAB 1: TEMPERATURE & ENTROPY STATE
  // ==========================================
  let tempT1 = 0.7;
  const t1Logits = [
    { word: "quantum", logit: 6.2 },
    { word: "classical", logit: 5.4 },
    { word: "digital", logit: 4.1 },
    { word: "optical", logit: 3.2 },
    { word: "analog", logit: 2.1 },
    { word: "banana", logit: 0.3 }
  ];

  function computeSoftmax(items: { word: string; logit: number }[], temp: number) {
    const t = Math.max(0.05, temp);
    const maxL = Math.max(...items.map(i => i.logit / t));
    const exps = items.map(i => Math.exp(i.logit / t - maxL));
    const sum = exps.reduce((a, b) => a + b, 0);
    return items.map((item, idx) => ({
      ...item,
      prob: exps[idx] / sum
    }));
  }

  $: t1Probs = computeSoftmax(t1Logits, tempT1);
  $: t1MaxIdx = t1Probs.reduce((maxI, curr, i, arr) => curr.prob > arr[maxI].prob ? i : maxI, 0);

  // ==========================================
  // TAB 2 & 3: LENA VOITA'S DUAL CONTEXTS
  // ==========================================
  const flatTokens = [
    { word: "red", prob: 0.052 },
    { word: "white", prob: 0.048 },
    { word: "black", prob: 0.045 },
    { word: "pink", prob: 0.042 },
    { word: "blue", prob: 0.040 },
    { word: "green", prob: 0.038 },
    { word: "yellow", prob: 0.035 },
    { word: "violet", prob: 0.032 },
    { word: "olive", prob: 0.030 },
    { word: "grey", prob: 0.028 },
    { word: "brown", prob: 0.025 },
    { word: "orange", prob: 0.022 },
    { word: "gold", prob: 0.020 },
    { word: "silver", prob: 0.018 }
  ];

  const peakyTokens = [
    { word: "on", prob: 0.485 },
    { word: "off", prob: 0.455 },
    { word: "broken", prob: 0.018 },
    { word: "stuck", prob: 0.014 },
    { word: "flickering", prob: 0.009 },
    { word: "red", prob: 0.006 },
    { word: "loose", prob: 0.005 },
    { word: "replaced", prob: 0.004 },
    { word: "dim", prob: 0.002 },
    { word: "hot", prob: 0.002 }
  ];

  // Tab 2: Top-K Slider
  let topKVal = 4;

  function evaluateTopK(list: typeof flatTokens, k: number) {
    let mass = 0;
    return {
      items: list.map((item, idx) => {
        const kept = idx < k;
        if (kept) mass += item.prob;
        return { ...item, kept };
      }),
      massCaptured: mass,
      count: Math.min(k, list.length)
    };
  }

  $: tab2Flat = evaluateTopK(flatTokens, topKVal);
  $: tab2Peaky = evaluateTopK(peakyTokens, topKVal);

  // Tab 3: Top-p Slider
  let topPVal = 0.85;

  function evaluateTopP(list: typeof flatTokens, p: number) {
    let cum = 0;
    let count = 0;
    const items = list.map((item) => {
      // Retain until cumulative mass reaches or exceeds p
      const kept = cum < p;
      cum += item.prob;
      if (kept) count++;
      return { ...item, kept, cumAtThisPoint: cum };
    });
    const massCaptured = items.filter(i => i.kept).reduce((acc, i) => acc + i.prob, 0);
    return { items, massCaptured, count };
  }

  $: tab3Flat = evaluateTopP(flatTokens, topPVal);
  $: tab3Peaky = evaluateTopP(peakyTokens, topPVal);

  // ==========================================
  // TAB 4: FULL PIPELINE & MULTINOMIAL ROLL
  // ==========================================
  type ContextKey = 'peaky' | 'flat' | 'medium';
  let selectedContextKey: ContextKey = 'peaky';

  const pipelineContexts: Record<ContextKey, { prompt: string; tokens: { word: string; logit: number }[] }> = {
    peaky: {
      prompt: "The light switch was turned",
      tokens: [
        { word: "on", logit: 6.8 },
        { word: "off", logit: 6.6 },
        { word: "broken", logit: 2.1 },
        { word: "stuck", logit: 1.8 },
        { word: "flickering", logit: 1.2 },
        { word: "red", logit: 0.5 }
      ]
    },
    flat: {
      prompt: "The dress color was",
      tokens: [
        { word: "red", logit: 4.8 },
        { word: "white", logit: 4.7 },
        { word: "black", logit: 4.6 },
        { word: "pink", logit: 4.5 },
        { word: "blue", logit: 4.4 },
        { word: "green", logit: 4.3 },
        { word: "yellow", logit: 4.1 },
        { word: "violet", logit: 4.0 }
      ]
    },
    medium: {
      prompt: "The ancient king ruled the",
      tokens: [
        { word: "kingdom", logit: 6.1 },
        { word: "realm", logit: 5.4 },
        { word: "land", logit: 5.1 },
        { word: "empire", logit: 4.8 },
        { word: "people", logit: 3.9 },
        { word: "banana", logit: 0.2 }
      ]
    }
  };

  let pipeTemp = 0.7;
  let pipeTopP = 0.85;
  let pipeTopK = 5;
  let useTopK = false;
  let useTopP = true;

  $: currentContext = pipelineContexts[selectedContextKey];
  $: rawSoftmax = computeSoftmax(currentContext.tokens, pipeTemp);

  $: filteredTokens = (() => {
    let sorted = [...rawSoftmax].sort((a, b) => b.prob - a.prob);
    let cum = 0;
    
    return sorted.map((item, idx) => {
      let keptByK = !useTopK || idx < pipeTopK;
      let keptByP = !useTopP || cum < pipeTopP;
      cum += item.prob;
      const kept = keptByK && keptByP;
      return { ...item, kept };
    });
  })();

  $: survivingSum = filteredTokens.filter(t => t.kept).reduce((acc, t) => acc + t.prob, 0);

  $: renormalizedTokens = filteredTokens.map(t => ({
    ...t,
    renormProb: t.kept && survivingSum > 0 ? t.prob / survivingSum : 0
  }));

  // Sampling Animation State
  let isRolling = false;
  let sampledToken: string | null = null;
  let rollRandomVal: number | null = null;

  function rollDice() {
    if (isRolling) return;
    isRolling = true;
    sampledToken = null;
    rollRandomVal = Math.random();

    // Accumulate renormalized distribution
    const survivors = renormalizedTokens.filter(t => t.kept);
    let cumulative = 0;
    let winner = survivors[survivors.length - 1]?.word ?? "None";

    for (const item of survivors) {
      cumulative += item.renormProb;
      if (rollRandomVal <= cumulative) {
        winner = item.word;
        break;
      }
    }

    // Brief rolling animation
    let counter = 0;
    const interval = setInterval(() => {
      sampledToken = survivors[Math.floor(Math.random() * survivors.length)].word;
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        sampledToken = winner;
        isRolling = false;
      }
    }, 50);
  }
</script>

<InteractiveCard 
  title="Output Sampling & Decoding Dynamics" 
  subtitle="Autoregressive models generate one word at a time. Temperature shapes probability entropy, while Nucleus (Top-p) truncation dynamically protects against hallucinations without starving open-ended contexts."
>
  <div class="sampling-explorer">
    
    <!-- TABS NAVIGATION -->
    <div class="tabs-header">
      <button class="tab-btn" class:active={activeTab === 1} on:click={() => activeTab = 1}>01 - Temperature & Entropy</button>
      <button class="tab-btn" class:active={activeTab === 2} on:click={() => activeTab = 2}>02 - Top-K</button>
      <button class="tab-btn" class:active={activeTab === 3} on:click={() => activeTab = 3}>03 - Top-p (Nucleus) </button>
      <button class="tab-btn" class:active={activeTab === 4} on:click={() => activeTab = 4}>04 - Full Pipeline & Dice Roll</button>
    </div>

    <div class="tab-content">
      
      <!-- ==========================================
           TAB 1: TEMPERATURE & ENTROPY
           ========================================== -->
      {#if activeTab === 1}
        <div class="stage-wrapper tab1">
          <div class="temp-layout">
            
            <div class="temp-controls-panel">
              <h3>Logit Scaling by Temperature (&tau;)</h3>
              <p class="desc">
                Logits are divided by &tau; before computing Softmax: 
                <code>P(w<sub>i</sub>) &prop; exp(z<sub>i</sub> / &tau;)</code>.
              </p>

              <div class="ctrl-group">
                <div class="lbl-row">
                  <span>Temperature (&tau;)</span>
                  <strong class="hl-num">{tempT1.toFixed(2)}</strong>
                </div>
                <input type="range" min="0.05" max="2.0" step="0.05" bind:value={tempT1} class="slider-hl" />
              </div>

              <div class="preset-pills">
                <button class="pill" class:active={tempT1 === 0.1} on:click={() => tempT1 = 0.1}>Greedy Argmax (0.1)</button>
                <button class="pill" class:active={tempT1 === 0.7} on:click={() => tempT1 = 0.7}>Balanced (0.7)</button>
                <button class="pill" class:active={tempT1 === 1.2} on:click={() => tempT1 = 1.2}>Creative (1.2)</button>
                <button class="pill" class:active={tempT1 === 2.0} on:click={() => tempT1 = 2.0}>High Entropy (2.0)</button>
              </div>

              <div class="insight-card">
                {#if tempT1 <= 0.2}
                  <div class="insight-badge greedy">PEAKY SPIKE</div>
                  <p>As &tau; &rarr; 0, probabilities collapse into a one-hot vector on the highest logit ("{t1Probs[t1MaxIdx].word}"). The model becomes completely deterministic.</p>
                {:else if tempT1 >= 1.4}
                  <div class="insight-badge uniform">UNIFORM FLATTENING</div>
                  <p>As &tau; increases, the differences between logits vanish. The distribution flattens into maximum entropy, leading to incoherent or random outputs.</p>
                {:else}
                  <div class="insight-badge standard">CALIBRATED DISTRIBUTION</div>
                  <p>Standard operating range preserves meaningful ranking differences while giving plausible alternatives a non-zero probability.</p>
                {/if}
              </div>
            </div>

            <!-- Distribution Histogram -->
            <div class="temp-chart-panel">
              <h4>Candidate Probability Distribution</h4>
              <div class="bars-stack">
                {#each t1Probs as item, i}
                  <div class="prob-row">
                    <span class="token-name" class:is-lead={i === t1MaxIdx}>{item.word}</span>
                    <div class="bar-track">
                      <div 
                        class="bar-fill" 
                        class:lead-fill={i === t1MaxIdx} 
                        style="width: {item.prob * 100}%;"
                      ></div>
                    </div>
                    <span class="pct-lbl">{(item.prob * 100).toFixed(1)}%</span>
                  </div>
                {/each}
              </div>
            </div>

          </div>
        </div>

      <!-- ==========================================
           TAB 2: THE TOP-K
           ========================================== -->
      {:else if activeTab === 2}
        <div class="stage-wrapper tab2">
          <div class="dual-header">
            <div>
              <h3>Fixed K is Not Always Optimal</h3>
              <p class="desc">A fixed K fails across varying contexts: it starves flat distributions while letting unlikely tail noise into peaky ones.</p>
            </div>
            
            <div class="topk-slider-box">
              <div class="lbl-row">
                <span>Fixed Truncation:</span>
                <strong style="color: var(--highlight)">Top-K = {topKVal}</strong>
              </div>
              <input type="range" min="1" max="8" step="1" bind:value={topKVal} class="slider-hl" />
            </div>
          </div>

          <div class="dual-columns-grid">
            
            <!-- COLUMN A: FLAT CONTEXT -->
            <div class="context-column">
              <div class="col-head">
                <span class="prompt-text">"The dress color was _______"</span>
                <span class="type-badge flat">Flat Distribution (Open Ambiguity)</span>
              </div>

              <div class="tokens-list">
                {#each tab2Flat.items as item}
                  <div class="token-row" class:pruned={!item.kept}>
                    <span class="tok-lbl">{item.word}</span>
                    <div class="prob-bar-track">
                      <div class="prob-bar-fill" style="width: {item.prob * 1000}%;"></div>
                    </div>
                    <span class="tok-prob">{item.prob.toFixed(3)}</span>
                    {#if !item.kept}
                      <span class="prune-tag">Filtered</span>
                    {/if}
                  </div>
                {/each}
              </div>

              <div class="telemetry-footer danger-border">
                <div class="stat-row">
                  <span>Probability Mass Retained:</span>
                  <strong class="stat-num red">{(tab2Flat.massCaptured * 100).toFixed(1)}%</strong>
                </div>
                <div class="verdict-note">
                  ⚠️ <strong>Not enough tokens!</strong> With K={topKVal}, the model discards valid colors ({100 - Math.round(tab2Flat.massCaptured * 100)}% of probability mass is blocked).
                </div>
              </div>
            </div>

            <!-- COLUMN B: PEAKY CONTEXT -->
            <div class="context-column">
              <div class="col-head">
                <span class="prompt-text">"The light switch was _______"</span>
                <span class="type-badge peaky">Peaky Distribution (High Certainty)</span>
              </div>

              <div class="tokens-list">
                {#each tab2Peaky.items as item}
                  <div class="token-row" class:pruned={!item.kept}>
                    <span class="tok-lbl">{item.word}</span>
                    <div class="prob-bar-track">
                      <div class="prob-bar-fill peaky-color" style="width: {item.prob * 100}%;"></div>
                    </div>
                    <span class="tok-prob">{item.prob.toFixed(3)}</span>
                    {#if !item.kept}
                      <span class="prune-tag">Filtered</span>
                    {/if}
                  </div>
                {/each}
              </div>

              <div class="telemetry-footer warning-border">
                <div class="stat-row">
                  <span>Probability Mass Retained:</span>
                  <strong class="stat-num green">{(tab2Peaky.massCaptured * 100).toFixed(1)}%</strong>
                </div>
                <div class="verdict-note">
                  ⚠️ <strong>Too many tokens!</strong> The true choice was binary ("on"/"off"). Top-{topKVal} forces rare hallucinations ("broken", "stuck") into the candidate set.
                </div>
              </div>
            </div>

          </div>
        </div>

      <!-- ==========================================
           TAB 3: TOP-P (NUCLEUS) ADAPTABILITY
           ========================================== -->
      {:else if activeTab === 3}
        <div class="stage-wrapper tab3">
          <div class="dual-header">
            <div>
              <h3>Nucleus (Top-p) Sampling: Dynamic Thresholding</h3>
              <p class="desc">
                Instead of fixing the <em>count</em> of words, Top-p takes the smallest set of tokens covering <strong>p% of the probability mass</strong>. The candidate pool dynamically expands and contracts.
              </p>
            </div>
            
            <div class="topk-slider-box">
              <div class="lbl-row">
                <span>Nucleus Threshold:</span>
                <strong style="color: var(--accent)">Top-p = {Math.round(topPVal * 100)}%</strong>
              </div>
              <input type="range" min="0.40" max="0.95" step="0.05" bind:value={topPVal} class="slider-blue" />
            </div>
          </div>

          <div class="dual-columns-grid">
            
            <!-- FLAT CONTEXT (EXPANDS) -->
            <div class="context-column">
              <div class="col-head">
                <span class="prompt-text">"The dress color was _______"</span>
                <span class="type-badge flat">Dynamic Pool Expansion</span>
              </div>

              <div class="tokens-list">
                {#each tab3Flat.items as item}
                  <div class="token-row" class:pruned={!item.kept}>
                    <span class="tok-lbl">{item.word}</span>
                    <div class="prob-bar-track">
                      <div class="prob-bar-fill" style="width: {item.prob * 1000}%;"></div>
                    </div>
                    <span class="tok-prob">{item.prob.toFixed(3)}</span>
                    {#if !item.kept}
                      <span class="prune-tag">Cut</span>
                    {/if}
                  </div>
                {/each}
              </div>

              <div class="telemetry-footer success-border">
                <div class="stat-row">
                  <span>Candidate Pool Size:</span>
                  <strong class="stat-num accent">{tab3Flat.count} tokens</strong>
                </div>
                <div class="verdict-note">
                  ✅ <strong>Automatically expands!</strong> Because entropy is high, Top-p kept {tab3Flat.count} tokens to reach {Math.round(topPVal * 100)}% probability, preserving rich variety.
                </div>
              </div>
            </div>

            <!-- PEAKY CONTEXT (CONTRACTS) -->
            <div class="context-column">
              <div class="col-head">
                <span class="prompt-text">"The light switch was _______"</span>
                <span class="type-badge peaky">Dynamic Pool Contraction</span>
              </div>

              <div class="tokens-list">
                {#each tab3Peaky.items as item}
                  <div class="token-row" class:pruned={!item.kept}>
                    <span class="tok-lbl">{item.word}</span>
                    <div class="prob-bar-track">
                      <div class="prob-bar-fill peaky-color" style="width: {item.prob * 100}%;"></div>
                    </div>
                    <span class="tok-prob">{item.prob.toFixed(3)}</span>
                    {#if !item.kept}
                      <span class="prune-tag">Cut</span>
                    {/if}
                  </div>
                {/each}
              </div>

              <div class="telemetry-footer success-border">
                <div class="stat-row">
                  <span>Candidate Pool Size:</span>
                  <strong class="stat-num accent">{tab3Peaky.count} tokens</strong>
                </div>
                <div class="verdict-note">
                  ✅ <strong>Automatically contracts!</strong> The top 2 tokens alone satisfy {Math.round(topPVal * 100)}% of the distribution. Unlikely tail noise is completely shut out.
                </div>
              </div>
            </div>

          </div>
        </div>

      <!-- ==========================================
           TAB 4: FULL PIPELINE & MULTINOMIAL ROLL
           ========================================== -->
      {:else if activeTab === 4}
        <div class="stage-wrapper tab4">
          <div class="pipeline-container">
            
            <!-- PIPELINE CONTROLS -->
            <div class="pipeline-sidebar">
              <h3>Generation Config</h3>
              
              <div class="ctrl-group">
                <span class="sub-lbl">1. Select Prompt Context</span>
                <select bind:value={selectedContextKey} class="select-context">
                  <option value="peaky">Peaky: "The light switch was turned..."</option>
                  <option value="flat">Flat: "The dress color was..."</option>
                  <option value="medium">Medium: "The ancient king ruled the..."</option>
                </select>
              </div>

              <div class="ctrl-group">
                <div class="lbl-row">
                  <span>Temperature (&tau;)</span>
                  <strong class="hl-num">{pipeTemp.toFixed(2)}</strong>
                </div>
                <input type="range" min="0.1" max="2.0" step="0.05" bind:value={pipeTemp} class="slider-hl" />
              </div>

              <div class="ctrl-group">
                <label class="checkbox-row">
                  <input type="checkbox" bind:checked={useTopP} />
                  <span>Enable Top-p (Nucleus)</span>
                </label>
                {#if useTopP}
                  <div class="lbl-row">
                    <span>Nucleus Cutoff (p)</span>
                    <strong style="color: var(--accent)">{pipeTopP.toFixed(2)}</strong>
                  </div>
                  <input type="range" min="0.2" max="1.0" step="0.05" bind:value={pipeTopP} class="slider-blue" />
                {/if}
              </div>

              <div class="ctrl-group">
                <label class="checkbox-row">
                  <input type="checkbox" bind:checked={useTopK} />
                  <span>Enable Top-K</span>
                </label>
                {#if useTopK}
                  <div class="lbl-row">
                    <span>Max Tokens (K)</span>
                    <strong style="color: var(--highlight)">{pipeTopK}</strong>
                  </div>
                  <input type="range" min="1" max="6" step="1" bind:value={pipeTopK} class="slider-hl" />
                {/if}
              </div>

              <button class="roll-btn" on:click={rollDice} disabled={isRolling}>
                {#if isRolling}
                  Sampling...
                {:else}
                  🎲 Roll Next Token
                {/if}
              </button>

              {#if sampledToken}
                <div class="winner-callout">
                  <span class="win-sub">Sampled Next Token:</span>
                  <strong class="win-word">"{sampledToken}"</strong>
                  {#if rollRandomVal !== null}
                    <span class="roll-val">(from random roll r = {rollRandomVal.toFixed(3)})</span>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- RENORMALIZATION & CANDIDATE VIEW -->
            <div class="pipeline-main">
              <div class="pipeline-banner">
                <div class="step-desc">
                  <span>Prompt: </span><strong>"{currentContext.prompt}"</strong>
                </div>
                <div class="renorm-gauge">
                  <span>Filtered Mass: <strong>{(survivingSum * 100).toFixed(1)}%</strong></span>
                  <span class="arrow-sym">&rarr;</span>
                  <span>Renormalized Sum: <strong>100.0%</strong></span>
                </div>
              </div>

              <div class="table-container">
                <table class="pipeline-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Logit</th>
                      <th>Softmax P(w)</th>
                      <th>Status</th>
                      <th>Renormalized P'(w)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each renormalizedTokens as item}
                      <tr class:is-pruned={!item.kept} class:is-selected={item.word === sampledToken}>
                        <td class="token-cell"><strong>{item.word}</strong></td>
                        <td class="num-cell">{item.logit.toFixed(1)}</td>
                        <td class="num-cell">{(item.prob * 100).toFixed(1)}%</td>
                        <td>
                          {#if item.kept}
                            <span class="tag kept">Retained</span>
                          {:else}
                            <span class="tag pruned">Filtered</span>
                          {/if}
                        </td>
                        <td class="num-cell highlight-cell">
                          {#if item.kept}
                            {(item.renormProb * 100).toFixed(1)}%
                          {:else}
                            —
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>

              <div class="pipeline-explainer">
                <code>probs_sort.div_(probs_sort.sum(dim=-1, keepdim=True))</code>
                <p>
                  Notice that after the tail tokens are pruned, the surviving probabilities are divided by the remaining sum (<strong>{(survivingSum * 100).toFixed(1)}%</strong>) so they sum to exactly 1.0 before the multinomial dice roll.
                </p>
              </div>
            </div>

          </div>
        </div>
      {/if}

    </div>
  </div>
</InteractiveCard>

<style>
  .sampling-explorer { display: flex; flex-direction: column; width: 100%; }
  
  .tabs-header { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 2rem; overflow-x: auto; }
  .tab-btn { background: none; border: none; padding: 1rem 1.5rem; font-family: 'Space Grotesk', sans-serif; font-weight: 600; color: var(--muted); cursor: pointer; transition: all 0.2s; border-bottom: 2px solid transparent; white-space: nowrap; }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

  .stage-wrapper { animation: fadeIn 0.3s ease-out; width: 100%; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

  .desc { font-size: 0.9rem; color: var(--muted); margin: 0.25rem 0 1rem 0; line-height: 1.5; }
  .desc code { font-family: 'JetBrains Mono', monospace; color: var(--highlight); }

  /* TAB 1 */
  .temp-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 2.5rem; }
  @media (max-width: 800px) { .temp-layout { grid-template-columns: 1fr; } }
  
  .temp-controls-panel { display: flex; flex-direction: column; gap: 1.25rem; }
  .temp-controls-panel h3 { font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text); }
  
  .ctrl-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .lbl-row { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); }
  .hl-num { color: var(--highlight); }
  .slider-hl { accent-color: var(--highlight); cursor: pointer; }
  .slider-blue { accent-color: var(--accent); cursor: pointer; }

  .preset-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .pill { background: var(--surface2); border: 1px solid var(--border); color: var(--muted); padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: all 0.2s; }
  .pill:hover { border-color: var(--text); color: var(--text); }
  .pill.active { border-color: var(--highlight); color: var(--highlight); background: rgba(245, 158, 11, 0.1); font-weight: 600; }

  .insight-card { background: var(--surface2); border: 1px solid var(--border); border-left: 3px solid var(--accent); padding: 1rem 1.25rem; border-radius: 8px; margin-top: 0.5rem; }
  .insight-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 0.5rem; }
  .insight-badge.greedy { background: rgba(239, 68, 68, 0.15); color: var(--red); }
  .insight-badge.uniform { background: rgba(59, 130, 246, 0.15); color: var(--blue); }
  .insight-badge.standard { background: rgba(34, 197, 94, 0.15); color: var(--green); }
  .insight-card p { font-size: 0.85rem; color: var(--text); opacity: 0.9; margin: 0; line-height: 1.4; }

  .temp-chart-panel { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .temp-chart-panel h4 { margin: 0; font-size: 1rem; color: var(--text); font-family: 'Space Grotesk', sans-serif; }
  .bars-stack { display: flex; flex-direction: column; gap: 0.75rem; }
  .prob-row { display: grid; grid-template-columns: 80px 1fr 50px; gap: 1rem; align-items: center; }
  .token-name { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: var(--text); }
  .token-name.is-lead { font-weight: 700; color: var(--highlight); }
  .bar-track { height: 16px; background: var(--bg); border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
  .bar-fill { height: 100%; background: var(--muted); transition: width 0.2s ease-out; }
  .bar-fill.lead-fill { background: var(--highlight); }
  .pct-lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); text-align: right; }

  /* TABS 2 & 3: DUAL CONTEXTS */
  .dual-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 2rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .dual-header h3 { font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text); }
  .topk-slider-box { min-width: 250px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1.25rem; }
  
  .dual-columns-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
  @media (max-width: 800px) { .dual-columns-grid { grid-template-columns: 1fr; } }
  
  .context-column { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .col-head { display: flex; flex-direction: column; gap: 0.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; }
  .prompt-text { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 700; color: var(--text); }
  .type-badge { font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; width: fit-content; }
  .type-badge.flat { background: rgba(59, 130, 246, 0.15); color: var(--blue); }
  .type-badge.peaky { background: rgba(245, 158, 11, 0.15); color: var(--highlight); }

  .tokens-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 280px; overflow-y: auto; padding-right: 0.5rem; }
  .token-row { display: grid; grid-template-columns: 65px 1fr 45px 50px; gap: 0.75rem; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; padding: 2px 4px; border-radius: 4px; }
  .token-row.pruned { opacity: 0.3; }
  .tok-lbl { color: var(--text); font-weight: 600; }
  .prob-bar-track { height: 8px; background: var(--bg); border-radius: 2px; overflow: hidden; }
  .prob-bar-fill { height: 100%; background: var(--blue); }
  .prob-bar-fill.peaky-color { background: var(--highlight); }
  .tok-prob { color: var(--muted); text-align: right; }
  .prune-tag { font-size: 0.6rem; color: var(--red); border: 1px solid var(--red); padding: 1px 3px; border-radius: 3px; text-align: center; }

  .telemetry-footer { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.4rem; margin-top: auto; }
  .danger-border { border-left: 3px solid var(--red); }
  .warning-border { border-left: 3px solid var(--highlight); }
  .success-border { border-left: 3px solid var(--green); }
  .stat-row { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted); }
  .stat-num { font-size: 0.9rem; }
  .stat-num.red { color: var(--red); }
  .stat-num.green { color: var(--green); }
  .stat-num.accent { color: var(--accent); }
  .verdict-note { font-size: 0.8rem; color: var(--text); opacity: 0.85; line-height: 1.4; }

  /* TAB 4: FULL PIPELINE */
  .pipeline-container { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; }
  @media (max-width: 850px) { .pipeline-container { grid-template-columns: 1fr; } }

  .pipeline-sidebar { background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
  .pipeline-sidebar h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text); }
  .sub-lbl { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
  .select-context { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem; border-radius: 6px; font-family: 'Space Grotesk', sans-serif; font-size: 0.8rem; cursor: pointer; }
  .checkbox-row { display: flex; align-items: center; gap: 0.5rem; font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; color: var(--text); cursor: pointer; }

  .roll-btn { background: var(--accent); color: white; border: none; padding: 0.75rem; border-radius: 8px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: opacity 0.2s; margin-top: 0.5rem; }
  .roll-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .roll-btn:hover:not(:disabled) { opacity: 0.9; }

  .winner-callout { background: rgba(99, 102, 241, 0.1); border: 1px solid var(--accent); border-radius: 8px; padding: 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; text-align: center; }
  .win-sub { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); text-transform: uppercase; }
  .win-word { font-family: 'Space Grotesk', sans-serif; font-size: 1.3rem; color: var(--accent); }
  .roll-val { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); }

  .pipeline-main { display: flex; flex-direction: column; gap: 1rem; }
  .pipeline-banner { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
  .step-desc { font-size: 0.9rem; color: var(--muted); }
  .step-desc strong { color: var(--text); }
  .renorm-gauge { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--muted); display: flex; align-items: center; gap: 0.5rem; }
  .renorm-gauge strong { color: var(--highlight); }
  .arrow-sym { color: var(--accent); }

  .table-container { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; }
  .pipeline-table { width: 100%; border-collapse: collapse; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; text-align: left; }
  .pipeline-table th { padding: 0.6rem 1rem; background: var(--bg); border-bottom: 1px solid var(--border); color: var(--muted); font-size: 0.7rem; text-transform: uppercase; }
  .pipeline-table td { padding: 0.6rem 1rem; border-bottom: 1px solid var(--border); }
  .pipeline-table tr.is-pruned { opacity: 0.35; }
  .pipeline-table tr.is-selected { background: rgba(99, 102, 241, 0.15); }
  .pipeline-table tr.is-selected td { color: var(--accent); font-weight: 700; }
  .token-cell strong { font-family: 'Space Grotesk', sans-serif; font-size: 0.95rem; }
  .num-cell { color: var(--text); }
  .highlight-cell { color: var(--accent); font-weight: 700; }
  .tag { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; font-weight: 700; }
  .tag.kept { background: rgba(34, 197, 94, 0.15); color: var(--green); }
  .tag.pruned { background: rgba(239, 68, 68, 0.15); color: var(--red); }

  .pipeline-explainer { background: var(--bg); border: 1px dashed var(--border); border-radius: 8px; padding: 0.75rem 1rem; }
  .pipeline-explainer code { font-family: 'JetBrains Mono', monospace; color: var(--highlight); font-size: 0.75rem; display: block; margin-bottom: 0.25rem; }
  .pipeline-explainer p { margin: 0; font-size: 0.8rem; color: var(--muted); line-height: 1.4; }
</style>