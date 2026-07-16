---
title: Multi-Head Latent Attention
slug: mla
---

<script>
  import { activeStep } from '$lib/stores/diagram';
  import { dModel, latentDim, seqLen } from '$lib/stores/config';

  let mhaCache = $derived($dModel * 2);
  let savings = $derived(Math.round((1 - $latentDim / ($dModel * 2)) * 100));
  let bandwidthReduction = $derived((($dModel * 2) / $latentDim).toFixed(1));
</script>

# Multi-Head Latent Attention

Introduced in [**DeepSeek-V2**](https://arxiv.org/abs/2405.04434), used in **V3 and R1**. Compresses the KV cache to a fraction of its normal size — with *better* modeling quality than MHA.

---

<div class="step" data-step-id="mla-input" data-active-dims="seqLen,dModel">
<span class="step-badge">Step 01</span>

## Same Input, Different Strategy

Input: **[{$seqLen} × {$dModel}]** — identical to MHA.

The difference is what MLA does *next*: instead of projecting to full K and V immediately, it first compresses everything into a tiny latent vector.

</div>


<div class="step" data-step-id="mla-compress" data-active-dims="seqLen,dModel,latentRatio">
<span class="step-badge">Step 02</span>

## The Down-Projection (KV Latent)

A single matrix **W_DKV** compresses the input into a smaller latent space.

**c_KV is what gets written to the KV cache** — not K and V themselves.

Memory comparison:

- MHA cache/token: `{mhaCache}` values (K + V)  
- MLA cache/token: `{$latentDim}` values (c_KV)  
- **Savings: ~{savings}%**

</div>


<div class="step" data-step-id="mla-expand" data-active-dims="seqLen,dModel,latentRatio">
<span class="step-badge">Step 03</span>

## The Up-Projections at Inference

When computing attention, c_KV is expanded back to full dimension.

Two extra matmuls per step — but reading `{$latentDim}` values from cache vs `{mhaCache}` is a **{bandwidthReduction}× memory bandwidth reduction**.

</div>


<div class="step" data-step-id="mla-q" data-active-dims="seqLen,dModel,latentRatio">
<span class="step-badge">Step 04</span>

## Query Compression (Training Only)

Queries are also compressed during training — but since Q is computed fresh each step at inference, it's **never cached**.

This acts as a bottleneck regularizer during training.

</div>


---

## Why Not Just Use GQA?

From DeepSeek-V2 ablation studies:

| | KV Cache Size | Modeling Quality |
|---|---|---|
| MHA | 100% | Baseline |
| GQA | ~25–50% | Slightly worse |
| **MLA** | **~5–13%** | **Slightly better** |

MLA doesn't sacrifice quality for efficiency — it improves both. The compression bottleneck seems to act as a beneficial regularizer.