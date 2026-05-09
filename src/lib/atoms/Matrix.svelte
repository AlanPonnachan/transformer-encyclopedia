<script lang="ts">
  import { makeMatrix, heatColor, normalize } from '$lib/math/utils';
  import { hoveredId } from '$lib/stores/diagram';
  export let rows = 4, cols = 4;
  export let data: number[][] | null = null;
  export let label = '', sublabel = '', id = '';
  export let cellSize = 24;
  export let colorMode: 'heat' | 'signed' | 'flat' = 'heat';
  export let highlight = false, dimmed = false;

  $: displayData = data ?? makeMatrix(rows, cols, id.length + 7);

  function getCellColor(val: number): string {
    if (colorMode === 'flat') return 'var(--surface2)';
    if (colorMode === 'heat') return heatColor(val);
    const t = normalize(val);
    if (t < 0.5) {
      const u = t * 2;
      return `rgb(${Math.round(30+29*u)},${Math.round(80+50*u)},${Math.round(180+66*u)})`;
    }
    const u = (t - 0.5) * 2;
    return `rgb(${Math.round(180+59*u)},${Math.round(50*(1-u))},${Math.round(60*(1-u))})`;
  }
  $: w = cols * cellSize;
  $: h = rows * cellSize;
</script>

<div class="wrap" class:hl={highlight} class:dm={dimmed}>
  {#if label}<div class="lbl">{label}</div>{/if}
  <svg width={w+2} height={h+2} style="display:block" role="img" aria-label={label||'matrix'}>
    {#each displayData as row, r}
      {#each row as val, c}
        <rect x={c*cellSize+1} y={r*cellSize+1}
          width={cellSize-2} height={cellSize-2} rx="2"
          fill={getCellColor(val)} opacity={dimmed?0.3:1}
          on:mouseenter={() => hoveredId.set(`${id}-${r}-${c}`)}
          on:mouseleave={() => hoveredId.set(null)}
          style="cursor:pointer;transition:opacity 0.2s"
        />
      {/each}
    {/each}
    <rect x="0.5" y="0.5" width={w} height={h} rx="4" fill="none"
      stroke={highlight?'var(--accent)':'var(--border)'}
      stroke-width={highlight?1.5:1}
    />
  </svg>
  {#if sublabel}<div class="sub">{sublabel}</div>{/if}
</div>

<style>
  .wrap { display:flex; flex-direction:column; align-items:center; gap:5px; transition:transform 0.2s; }
  .wrap.hl { transform:scale(1.04); }
  .wrap.dm { opacity:0.35; }
  .lbl { font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:var(--accent); font-weight:500; text-align:center; }
  .sub { font-family:'JetBrains Mono',monospace; font-size:0.6rem; color:var(--muted); text-align:center; white-space:nowrap; }
</style>