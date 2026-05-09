---
title: Multi-Head Attention
slug: mha
---

<script>
  import { activeStep } from '$lib/stores/diagram';
  import { dModel, numHeads, seqLen, headDim } from '$lib/stores/config';

  // Calculate math safely inside the script block
  let floatValues = $derived(2 * $dModel);
  let contextValuesM = $derived(((2 * $dModel * 100000 * 32) / 1e6).toFixed(0));
  let contextValuesGB = $derived(((2 * $dModel * 100000 * 32 * 2) / 1e9).toFixed(1));
</script>

# Multi-Head Attention

The original attention from *Attention Is All You Need* (Vaswani et al., 2017). Every modern Transformer builds on this.

---

<div class="step" data-step-id="input">
<span class="step-badge">Step 01</span>

## The Input Matrix

For a sequence of `{$seqLen}` tokens, each embedded into `{$dModel}` dimensions, the input is a **[{$seqLen} × {$dModel}]** matrix. Each row is one token.

The same matrix X is used three times — once for each of Q, K, V.

</div>


<div class="step" data-step-id="projections">
<span class="step-badge">Step 02</span>

## Three Weight Matrices

Three learned projections — **W_Q**, **W_K**, **W_V** — each `[{$dModel} × {$dModel}]` — transform X into three different "views":

- **Q** — *What am I looking for?*
- **K** — *What do I have to offer?*
- **V** — *What do I actually return if selected?*

</div>


<div class="step" data-step-id="heads">
<span class="step-badge">Step 03</span>

## Split into {$numHeads} Heads

Each head gets a slice of dimension **d_head = {$headDim}**. Heads run in parallel — each learning different relationships (syntax, coreference, semantics...).

> No sequential dependency. Pure parallelism.

</div>


<div class="step" data-step-id="attn">
<span class="step-badge">Step 04</span>

## Scaled Dot-Product Attention

For each head, we calculate the attention scores.

The heatmap shows which tokens attend to which. The lower-triangle is the causal mask — each token only sees the past.

</div>


<div class="step" data-step-id="output">
<span class="step-badge">Step 05</span>

## Concat + W_O

All {$numHeads} head outputs are concatenated → **[{$seqLen} × {$dModel}]**, then projected via W_O. This "mixes" cross-head information.

The output shape is identical to the input — clean residual stream integration.

</div>


---

## The KV Cache Problem

During inference, K and V for every past token are cached. For `d_model={$dModel}`, each token costs **{floatValues} float values per layer**. For a 100K context window across 32 layers, that's `{contextValuesM}M values` — around **{contextValuesGB}GB** in FP16.

This is exactly the problem MLA was designed to solve.