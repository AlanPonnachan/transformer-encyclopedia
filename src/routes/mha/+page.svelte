 <script lang="ts">
  import ScrollDeck from '$lib/components/common/ScrollDeck.svelte';
  import Card from '$lib/components/common/Card.svelte';
  import Matrix from '$lib/atoms/Matrix.svelte';
  import { dModel, numHeads, seqLen } from '$lib/stores/config';
  import { fakeAttentionWeights } from '$lib/components/mha/mha-logic';

  $: attnData = Array.from({length: Math.min($numHeads, 4)}, (_,i) => fakeAttentionWeights($seqLen, i));
</script>

<svelte:head><title>MHA — Transformer Encyclopedia</title></svelte:head>

<ScrollDeck steps={3}>
  
  <!-- Slide 1: Input -->
  <Card breadcrumb="MHA › THE INPUT MATRIX">
    <svelte:fragment slot="controls">
      <div class="ctrl-group">
        <span>Seq_Len</span><strong>{$seqLen}</strong>
        <input type="range" min="3" max="10" step="1" bind:value={$seqLen} />
      </div>
      <div class="ctrl-group">
        <span>D_Model</span><strong>{$dModel}</strong>
        <input type="range" min="128" max="1024" step="128" bind:value={$dModel} />
      </div>
    </svelte:fragment>

    <Matrix id="input_X" rows={$seqLen} cols={6} cellSize={28} label="X" sublabel="[{$seqLen}×{$dModel}]" highlight/>

    <svelte:fragment slot="footer">
      For a sequence of {$seqLen} tokens, each embedded into {$dModel} dimensions, the input is a [ {$seqLen} × {$dModel} ] matrix. Each row is one token. The same matrix X is used three times — once for each of Q, K, V.
    </svelte:fragment>
  </Card>


  <!-- Slide 2: Projections -->
  <Card breadcrumb="MHA › WEIGHT PROJECTIONS">
    <div class="row">
      <Matrix id="proj_Q" rows={5} cols={5} cellSize={24} label="W_Q" colorMode="signed" highlight/>
      <div class="math-sym">×</div>
      <Matrix id="proj_K" rows={5} cols={5} cellSize={24} label="W_K" colorMode="signed" highlight/>
      <div class="math-sym">×</div>
      <Matrix id="proj_V" rows={5} cols={5} cellSize={24} label="W_V" colorMode="signed" highlight/>
    </div>

    <svelte:fragment slot="footer">
      Three learned projections — W_Q, W_K, W_V — each transform X into three different "views". Q (What am I looking for?), K (What do I have to offer?), V (What do I actually return?).
    </svelte:fragment>
  </Card>


  <!-- Slide 3: Attention -->
  <Card breadcrumb="MHA › SCALED DOT-PRODUCT ATTENTION">
    <svelte:fragment slot="controls">
      <div class="ctrl-group">
        <span>Heads</span><strong>{$numHeads}</strong>
        <input type="range" min="1" max="12" step="1" bind:value={$numHeads} />
      </div>
    </svelte:fragment>

    <div class="row">
      {#each attnData as attn, i}
        <div class="hd">
          <div class="hn">Head {i+1}</div>
          <Matrix id={`attn_H${i+1}`} rows={$seqLen} cols={$seqLen} data={attn} cellSize={24} highlight/>
        </div>
      {/each}
      {#if $numHeads > 4}
        <div class="etc">+{$numHeads - 4} more</div>
      {/if}
    </div>

    <svelte:fragment slot="footer">
      Each head calculates attention scores independently in parallel. The heatmap shows which tokens attend to which. The lower-triangle is the causal mask — each token only sees the past.
    </svelte:fragment>
  </Card>

</ScrollDeck>

<style>
  .row { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; justify-content: center; }
  .math-sym { font-size: 2rem; color: var(--muted); padding: 0 1rem; }
  .hd { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .hn { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--text); font-weight: 700; text-transform: uppercase;}
  .etc { font-size: 0.85rem; color: var(--muted); font-family: 'JetBrains Mono', monospace; padding-left: 1rem; }
</style>