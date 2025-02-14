<script lang="ts">
  import type { Component } from "svelte";

  export let icon: Component;
  export let title: string;
  export let description: string;
</script>

<div
  class="group rounded-2xl border border-gray-800 bg-black p-8 transition-all hover:border-purple-500/30 hover:bg-purple-500/5"
>
  <div class="mb-5 inline-flex rounded-lg bg-purple-500/10 p-3">
    <svelte:component this={icon} class="h-6 w-6 text-purple-400" />
  </div>
  <h3 class="mb-4 text-xl font-semibold">{title}</h3>
  <p class="text-gray-400">
    {description}
  </p>
</div>
