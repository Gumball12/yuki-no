<script lang="ts">
  export let title: string;
  export let description: string;
</script>

<div class="mb-16 text-center">
  <h2 class="mb-4 text-3xl font-bold md:text-4xl">{title}</h2>
  <p class="mx-auto max-w-2xl text-gray-400">
    {description}
  </p>
</div>
