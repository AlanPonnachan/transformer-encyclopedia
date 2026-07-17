export const components = [
  { id:'mha', title:'Multi-Head Attention', abbr:'MHA', desc:'The foundational attention mechanism. Q, K, V, and all that jazz.', paper:'Attention Is All You Need (2017)', color:'#6366f1', ready:true },
  { id:'mla', title:'Multi-Head Latent Attention', abbr:'MLA', desc:"DeepSeek's KV cache compression. Smaller cache, better quality.", paper:'DeepSeek-V2 (2024)', color:'#10b981', ready:true },
  { id:'gqa', title:'Grouped Query Attention', abbr:'GQA', desc:'Share K/V heads across multiple Q heads. Used in Llama 2/3.', paper:'GQA (Ainslie et al., 2023)', color:'#f59e0b', ready:false },
  { id:'rope', title:'Rotary Positional Embeddings', abbr:'RoPE', desc:'Encode position by rotating Q and K in complex space.', paper:'RoFormer (Su et al., 2021)', color:'#ec4899', ready:false },
];