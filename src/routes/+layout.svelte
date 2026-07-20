<script lang="ts">
  import '../app.postcss';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { components } from '$lib/components';
  import { onMount } from 'svelte';

  let dropdownOpen = false;
  let theme: 'light' | 'dark' = 'dark';
  
  $: currentSlug = $page.params.slug;
  $: currentComponent = components.find(c => c.id === currentSlug);

  onMount(() => {
    // Check OS preference on load
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  });

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  function setTheme(t: 'light' | 'dark') {
    theme = t;
    document.documentElement.setAttribute('data-theme', theme);
  }

  function toggleDropdown(e: Event) {
    e.stopPropagation();
    dropdownOpen = !dropdownOpen;
  }
  function closeDropdown() { dropdownOpen = false; }
</script>

<svelte:window on:click={closeDropdown} />

<div class="layout-wrapper">
  
  <nav class="topbar">
    <div class="nav-left">
      <a href="{base}/" class="logo">
        <span class="muted">[</span><span class="text">Transformer</span><span class="accent">Encyclopedia</span><span class="muted">]</span>
      </a>

      {#if currentComponent}
        <span class="divider">/</span>
        <div class="dropdown-container">
          <button class="dropdown-toggle" on:click={toggleDropdown}>
            <span style="color: {currentComponent.color}; font-family: 'JetBrains Mono', monospace; font-weight: 700;">{currentComponent.abbr}</span>
            <span class="title-text">{currentComponent.title}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class:rotated={dropdownOpen}><path d="M6 9l6 6 6-6"/></svg>
          </button>

          {#if dropdownOpen}
            <div class="dropdown-menu">
              <div class="menu-header">Components</div>
              {#each components as c}
                <a href={c.ready ? `${base}/${c.id}` : '#'} class="menu-item" class:disabled={!c.ready} class:active={currentSlug === c.id} on:click={closeDropdown}>
                  <div class="menu-abbr" style="color: {c.color}">{c.abbr}</div>
                  <div class="menu-title">{c.title}</div>
                  {#if !c.ready}<span class="menu-badge">soon</span>{/if}
                </a>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
    
    <div class="nav-right">
      <button class="theme-toggle" on:click={toggleTheme} aria-label="Toggle theme">
        {#if theme === 'dark'}
          <!-- Sun Icon -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        {:else}
          <!-- Moon Icon -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        {/if}
      </button>
      <a href="https://github.com/your-username/transformer-encyclopedia" target="_blank" class="github-link">GitHub</a>
    </div>
  </nav>

  <main class="main-content"><slot /></main>
</div>

<style>
  .layout-wrapper { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); transition: background 0.3s ease; }
  
  .topbar { 
    height: 52px; background: var(--glass-bg); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; 
    padding: 0 1.5rem; position: sticky; top: 0; z-index: 200; transition: background 0.3s, border-color 0.3s;
  }
  
  .logo { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; font-weight: 700; text-decoration: none; }
  .muted { color: var(--muted); } .text { color: var(--text); } .accent { color: var(--accent); }
  
  .nav-left { display: flex; align-items: center; gap: 0.8rem; }
  .divider { color: var(--border); font-family: 'JetBrains Mono', monospace; font-size: 1rem; user-select: none; }
  
  .dropdown-container { position: relative; }
  .dropdown-toggle { 
    background: transparent; border: 1px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 0.6rem; 
    font-family: 'Space Grotesk', sans-serif; font-size: 0.85rem; color: var(--text); padding: 4px 10px; border-radius: 6px; 
    transition: all 0.2s; 
  }
  .dropdown-toggle:hover, .dropdown-toggle:focus { background: var(--surface2); border-color: var(--border); }
  .title-text { font-weight: 500; }
  .dropdown-toggle svg { color: var(--muted); transition: transform 0.2s; }
  .dropdown-toggle svg.rotated { transform: rotate(180deg); }

  .dropdown-menu { 
    position: absolute; top: calc(100% + 8px); left: 0; background: var(--glass-bg); backdrop-filter: blur(16px);
    border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem; min-width: 280px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); 
    display: flex; flex-direction: column; gap: 2px;
  }
  
  .menu-header { font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--muted); text-transform: uppercase; padding: 0.5rem 0.75rem; letter-spacing: 0.05em; }
  .menu-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; text-decoration: none; border-radius: 6px; transition: background 0.2s; }
  .menu-item:hover:not(.disabled) { background: var(--surface2); }
  .menu-item.active { background: rgba(99,102,241,0.08); border-left: 2px solid var(--accent); padding-left: calc(0.75rem - 2px); }
  .menu-item.disabled { opacity: 0.35; cursor: default; }
  .menu-abbr { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700; width: 30px; }
  .menu-title { font-size: 0.82rem; color: var(--text); flex: 1; font-weight: 500; }
  .menu-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.55rem; color: var(--muted); border: 1px solid var(--border); padding: 0.1em 0.4em; border-radius: 3px; text-transform: uppercase; }

  .nav-right { display: flex; align-items: center; gap: 1rem; }
  .theme-toggle { background: transparent; border: none; color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: color 0.2s, background 0.2s; }
  .theme-toggle:hover { color: var(--text); background: var(--surface2); }
  .github-link { color: var(--muted); text-decoration: none; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; transition: color 0.2s; }
  .github-link:hover { color: var(--text); }
  
  .main-content { flex: 1; display: flex; flex-direction: column; }
</style>