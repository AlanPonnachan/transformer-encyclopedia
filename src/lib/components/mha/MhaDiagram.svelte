<script lang="ts">
  import Matrix from '$lib/atoms/Matrix.svelte';
  import MathLabel from '$lib/atoms/MathLabel.svelte';
  import { activeStep } from '$lib/stores/diagram';
  import { dModel, numHeads, seqLen, headDim } from '$lib/stores/config';
  import { fakeAttentionWeights } from './mha-logic';
  $: step = $activeStep;
  $: attnData = Array.from({length:Math.min($numHeads,3)}, (_,i) => fakeAttentionWeights($seqLen,i));
  const C=22, S=17;
  const eqnAttn = String.raw`\text{Attn}(Q,K,V)=\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_{head}}}\right)\!V`;
</script>

<div class="d">
  <div class="dt">Multi-Head Attention <span class="b">MHA</span></div>
  <div class="cfg">
    d_model=<strong>{$dModel}</strong> | heads=<strong>{$numHeads}</strong> |
    d_head=<strong>{$headDim}</strong> | seq=<strong>{$seqLen}</strong>
  </div>

  <!-- Input + Projections -->
  <div class="sec" class:act={step===''||step==='input'}>
    <div class="sl">Input → Q, K, V Projections</div>
    <div class="row">
      <Matrix rows={$seqLen} cols={6} cellSize={C} label="X" sublabel="[{$seqLen}×{$dModel}]" id="inp" highlight={step===''||step==='input'}/>
      <div class="arr">→</div>
      <div class="col">
        <Matrix rows={4} cols={4} cellSize={S} label="W_Q" id="wq" colorMode="signed" highlight={step==='projections'}/>
        <Matrix rows={4} cols={4} cellSize={S} label="W_K" id="wk" colorMode="signed" highlight={step==='projections'}/>
        <Matrix rows={4} cols={4} cellSize={S} label="W_V" id="wv" colorMode="signed" highlight={step==='projections'}/>
      </div>
      <div class="arr">→</div>
      <div class="col">
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="Q" sublabel="[{$seqLen}×{$dModel}]" id="Q" colorMode="signed" highlight={step==='qkv'}/>
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="K" sublabel="[{$seqLen}×{$dModel}]" id="K" colorMode="signed" highlight={step==='qkv'}/>
        <Matrix rows={$seqLen} cols={5} cellSize={S} label="V" sublabel="[{$seqLen}×{$dModel}]" id="V" highlight={step==='qkv'}/>
      </div>
    </div>
  </div>

  <!-- Attention weights -->
  <div class="sec" class:act={step==='attn'}>
    <div class="sl">Attention Scores per Head — softmax(QKᵀ/√d_head)</div>
    <div class="row">
      {#each attnData as attn, i}
        <div class="hd">
          <div class="hn">H{i+1}</div>
          <Matrix rows={$seqLen} cols={$seqLen} data={attn} cellSize={C} id="attn-{i}" highlight={step==='attn'}/>
        </div>
      {/each}
      {#if $numHeads > 3}<div class="etc">+{$numHeads-3} more</div>{/if}
    </div>
    <MathLabel math={eqnAttn} display/>
  </div>

  <!-- Output -->
  <div class="sec" class:act={step==='output'}>
    <div class="sl">Concat heads → W_O → Output</div>
    <div class="row">
      <Matrix rows={$seqLen} cols={5} cellSize={S} label="Concat" id="concat" colorMode="signed"/>
      <div class="arr">→</div>
      <Matrix rows={4} cols={4} cellSize={S} label="W_O" id="wo" colorMode="signed"/>
      <div class="arr">→</div>
      <Matrix rows={$seqLen} cols={6} cellSize={C} label="Output" sublabel="[{$seqLen}×{$dModel}]" id="out" highlight={step==='output'}/>
    </div>
  </div>
</div>

<style>
  .d { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem; height:100%; overflow-y:auto; display:flex; flex-direction:column; gap:1rem; }
  .dt { font-size:1rem; font-weight:700; color:var(--text); display:flex; align-items:center; gap:10px; }
  .b  { background:var(--accent); color:white; font-size:0.62rem; font-weight:700; padding:0.15em 0.5em; border-radius:4px; font-family:'JetBrains Mono',monospace; }
  .cfg{ font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:var(--muted); }
  .cfg strong { color:var(--highlight); }
  .sec{ border:1px solid var(--border); border-radius:8px; padding:1rem; background:var(--bg); transition:border-color 0.3s; }
  .sec.act { border-color:var(--accent); }
  .sl { font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:var(--muted); margin-bottom:0.75rem; }
  .row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .col{ display:flex; flex-direction:column; gap:8px; }
  .arr{ font-size:1rem; color:var(--muted); padding:0 2px; }
  .hd { display:flex; flex-direction:column; align-items:center; gap:5px; }
  .hn { font-family:'JetBrains Mono',monospace; font-size:0.62rem; color:var(--highlight); font-weight:700; }
  .etc{ font-size:0.75rem; color:var(--muted); font-family:'JetBrains Mono',monospace; align-self:center; }
</style>