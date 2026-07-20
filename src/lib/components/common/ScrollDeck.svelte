<script lang="ts">
  import { onMount } from 'svelte';
  export let steps: number = 0;
  
  let activeStep = 0;
  let container: HTMLElement;

  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          activeStep = Number(entry.target.getAttribute('data-index'));
        }
      });
    }, { root: container, threshold: 0.5 });
    
    const cards = container.querySelectorAll('.scroll-card');
    cards.forEach((card, i) => {
      card.setAttribute('data-index', i.toString());
      observer.observe(card);
    });
    return () => observer.disconnect();
  });
  
  function scrollTo(index: number) {
    const cards = container.querySelectorAll('.scroll-card');
    if (cards[index]) cards[index].scrollIntoView({ behavior: 'smooth' });
  }
</script>

<div class="scroll-deck" bind:this={container}>
  <slot></slot>
  <div class="dots">
    {#each Array(steps) as _, i}
       <button 
         class="dot" 
         class:active={activeStep === i} 
         on:click={() => scrollTo(i)}
         aria-label="Go to slide {i + 1}"
       ></button>
    {/each}
  </div>
</div>

<style>
  .scroll-deck { 
    height: calc(100vh - 52px); 
    overflow-y: auto; 
    scroll-snap-type: y mandatory; 
    position: relative; 
    scroll-behavior: smooth;
    background: var(--bg);
  }
  .dots { 
    position: fixed; right: 2rem; top: 50%; transform: translateY(-50%); 
    display: flex; flex-direction: column; gap: 12px; z-index: 50; 
  }
  .dot { 
    width: 8px; height: 8px; border-radius: 50%; 
    background: var(--border); border: none; cursor: pointer; 
    transition: background 0.3s, transform 0.3s; 
  }
  .dot.active { 
    background: var(--red); /* Matches your screenshot's red dot */
    transform: scale(1.3); 
  }
</style>