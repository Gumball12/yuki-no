<script lang="ts">
  import { onMount } from "svelte";

  let isVisible = false;
  let container: HTMLDivElement;

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible = true;
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.4,
      },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  });
</script>

<div
  bind:this={container}
  class="relative h-[300px] w-full overflow-hidden rounded-xl border border-gray-800 bg-black/50 transition-colors hover:border-purple-500/30 md:h-[200px]"
>
  <div
    class="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-transparent"
  ></div>

  <div
    class="relative flex h-full w-full flex-col items-center justify-center p-4 md:flex-row md:p-8"
  >
    <div
      class="w-full max-w-[280px] rounded-lg border border-gray-800 bg-black/80 p-4 backdrop-blur-sm md:w-[240px]"
    >
      <div class="mb-2 flex items-center gap-2">
        <svg
          class="h-5 w-5 text-gray-400"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
        <span class="text-sm text-gray-300">head-repo/docs</span>
      </div>
      <div class="space-y-2">
        <div class="h-2 w-3/4 rounded bg-gray-800"></div>
        <div class="h-2 w-1/2 rounded bg-gray-800"></div>
      </div>
    </div>

    <div class="relative h-8 w-[2px] md:h-[2px] md:w-32">
      <div class="absolute inset-0 bg-purple-500/30"></div>
      <div
        class="absolute left-1/2 z-1 h-4 w-4 -translate-1/2 rounded-full bg-purple-500 transition-all duration-[2500ms] ease-in-out md:top-1/2 md:left-0 md:h-3 md:w-3"
        class:start-pos={!isVisible}
        class:end-pos={isVisible}
      >
        <div
          class="absolute inset-0 animate-ping rounded-full bg-purple-500 opacity-75"
        ></div>
      </div>
    </div>

    <div
      class="w-full max-w-[280px] rounded-lg border border-gray-800 bg-black/80 p-4 backdrop-blur-sm md:w-[240px]"
      class:glow={isVisible}
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg
            class="h-5 w-5 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clip-rule="evenodd"
            />
          </svg>
          <span class="text-sm text-gray-300">New Translation Required</span>
        </div>
        <span
          class="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300"
          >sync</span
        >
      </div>
      <div class="space-y-2">
        <div class="h-2 w-full rounded bg-gray-800"></div>
        <div class="h-2 w-2/3 rounded bg-gray-800"></div>
      </div>
      <div class="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <span>pre-release: v4.0.0-beta.1</span>
      </div>
    </div>
  </div>
</div>

<style>
  @media (max-width: 768px) {
    .start-pos {
      top: 0;
    }

    .end-pos {
      top: 100%;
    }
  }

  @media (min-width: 768px) {
    .start-pos {
      left: 0;
    }

    .end-pos {
      left: 100%;
    }
  }

  .glow {
    animation: glow 3s ease-in-out infinite;
    animation-delay: 2500ms;
  }

  @keyframes glow {
    0% {
      box-shadow: 0 0 0 rgba(168, 85, 247, 0);
      border-color: rgb(63, 63, 70);
    }
    50% {
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
      border-color: rgba(168, 85, 247, 0.5);
    }
    100% {
      box-shadow: 0 0 0 rgba(168, 85, 247, 0);
      border-color: rgb(63, 63, 70);
    }
  }
</style>
