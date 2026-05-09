<script lang="ts">
  import { heatColor } from '$lib/math/utils';
  export let length = 8, data: number[] | null = null, label = '';
  export let direction: 'vertical' | 'horizontal' = 'vertical';
  export let cellSize = 20, highlight = false;
  function rng(i: number) { let s=(i+1)*2654435761; s=((s^(s>>>16))*0x45d9f3b)&0xffffffff; return ((s>>>0)/0xffffffff)*2-1; }
  $: d = data ?? Array.from({length}, (_,i)=>rng(i));
  $: w = direction==='horizontal' ? length*cellSize : cellSize;
  $: h = direction==='horizontal' ? cellSize : length*cellSize;
</script>
<div class="w" class:hl={highlight}>
  {#if label}<div class="l">{label}</div>{/if}
  <svg width={w+2} height={h+2} style="display:block">
    {#each d as val, i}
      {@const x = direction==='horizontal' ? i*cellSize+1 : 1}
      {@const y = direction==='horizontal' ? 1 : i*cellSize+1}
      <rect {x} {y} width={cellSize-2} height={cellSize-2} rx="2" fill={heatColor(val)}/>
    {/each}
    <rect x="0.5" y="0.5" width={w} height={h} rx="3" fill="none"
      stroke={highlight?'var(--accent)':'var(--border)'} stroke-width={highlight?1.5:1}/>
  </svg>
</div>
<style>
  .w { display:flex; flex-direction:column; align-items:center; gap:5px; }
  .w.hl { filter:drop-shadow(0 0 6px var(--accent)); }
  .l { font-family:'JetBrains Mono',monospace; font-size:0.68rem; color:var(--accent); }
</style>