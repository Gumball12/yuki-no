<script lang="ts">
  import { ArrowRightIcon } from "./icons";

  export let name: string;
  export let description: string;
  export let logoUrl: string;
  export let logoAlt: string;
  export let href: string;
</script>

<div
  class="relative rounded-2xl border border-gray-800 bg-gradient-to-b from-purple-500/5 p-6"
>
  <div class="absolute -top-4 left-1/2 -translate-x-1/2">
    <img
      src={logoUrl}
      alt={logoAlt}
      width="32"
      height="32"
      class="h-8 w-8"
    />
  </div>
  <h3 class="mb-2 text-lg font-semibold text-white">{name}</h3>
  <p class="mb-4 text-sm text-gray-400">{description}</p>
  <a
    {href}
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex items-center text-purple-400 hover:text-purple-300"
  >
    View Project
    <ArrowRightIcon class="ml-2 h-5 w-5" />
  </a>
</div> 