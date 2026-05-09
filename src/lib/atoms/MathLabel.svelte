<script lang="ts">
  import katex from 'katex';
  import 'katex/dist/katex.min.css';
  export let math = '', display = false, color = 'var(--text)';
  $: rendered = (() => { try { return katex.renderToString(math, {throwOnError:false, displayMode:display}); } catch { return math; } })();
</script>
<span class:display style="color:{color}" role="math">
  {@html rendered}
</span>
<style>
  span { font-size:0.85rem; }
  span.display { display:block; text-align:center; margin:0.75rem 0; }
</style>