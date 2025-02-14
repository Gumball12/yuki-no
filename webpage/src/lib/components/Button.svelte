<script lang="ts">
  export let href: string;
  export let variant: "primary" | "secondary" = "primary";
  export let target = "_blank";
  export let rel = "noopener noreferrer";
</script>

<a
  {href}
  {target}
  {rel}
  class="group inline-flex items-center rounded-lg {variant === 'primary'
    ? 'bg-white text-black hover:bg-purple-100'
    : 'border border-gray-700 bg-black text-white hover:bg-gray-900'} px-6 py-3 text-lg font-semibold transition-all"
>
  <slot />
  <slot name="icon" />
</a>
