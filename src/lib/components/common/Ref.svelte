<script lang="ts">
  import { highlightId } from '$lib/stores/diagram';
  export let target: string;
  export let color: string = 'var(--accent)';
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<span 
  class="interactive-ref" 
  style="--ref-color: {color}"
  on:mouseenter={() => $highlightId = target}
  on:mouseleave={() => $highlightId = null}
>
  <slot></slot>
</span>

<style>
  .interactive-ref {
    color: var(--text); font-weight: 600; cursor: pointer;
    border-bottom: 1px dashed var(--ref-color);
    transition: all 0.2s ease; padding: 0 2px; border-radius: 2px;
  }
  .interactive-ref:hover {
    background: color-mix(in srgb, var(--ref-color) 15%, transparent);
    color: var(--ref-color); border-bottom-style: solid;
  }
</style>