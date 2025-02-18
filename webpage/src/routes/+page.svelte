<script lang="ts">
  import { onMount } from "svelte";
  import type { Component } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import SectionTitle from "$lib/components/SectionTitle.svelte";
  import Button from "$lib/components/Button.svelte";
  import {
    LightningIcon,
    ClockIcon,
    ShieldIcon,
    RefreshIcon,
    CheckCircleIcon,
    ClipboardIcon,
    GitHubIcon,
    ArrowRightIcon,
  } from "$lib/components/icons";
  import AutoTrackingAnimation from "$lib/components/AutoTrackingAnimation.svelte";

  interface Feature {
    icon: Component;
    title: string;
    description: string;
  }

  const features: Feature[] = [
    {
      icon: LightningIcon,
      title: "GitHub-First Approach",
      description:
        "Native GitHub Action with zero external dependencies. Seamlessly integrates with your existing GitHub workflow and repository settings.",
    },
    {
      icon: ClockIcon,
      title: "Zero Configuration",
      description:
        "Start in under 5 minutes with simple workflow configuration. Automatic repository inference and smart defaults for immediate productivity.",
    },
    {
      icon: ShieldIcon,
      title: "Built for Open Source",
      description:
        "Free, open-source solution with built-in rate limiting and error recovery. Perfect for projects of any size.",
    },
  ];

  const powerfulFeatures: Feature[] = [
    {
      icon: RefreshIcon,
      title: "Smart Change Detection",
      description:
        "Intelligent batch processing of 5 commits per batch with automatic rate limiting. Never miss an upstream change again.",
    },
    {
      icon: CheckCircleIcon,
      title: "Release-Aware Updates",
      description:
        "Automatically tracks pre-releases and final releases. Prevents wasted effort on unreleased or changing content.",
    },
    {
      icon: ClipboardIcon,
      title: "Efficient Workflow",
      description:
        "Automated issue creation, smart labeling, and progress tracking.",
    },
  ];

  // SEO Metadata
  const title =
    "Yuki-no - GitHub Action for Documentation Translation Management";
  const description =
    "A GitHub Action that streamlines documentation translation projects by automating change detection, release tracking, and workflow management.";
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
</svelte:head>

<!-- Header -->
<header class="fixed top-0 right-0 left-0 z-50 bg-black/50 backdrop-blur-md">
  <nav
    class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"
    aria-label="Main navigation"
  >
    <a href="/" class="flex items-center gap-3" aria-label="Go to home">
      <img
        src="/logo.webp"
        alt="Yuki-no logo"
        width="32"
        height="32"
        class="h-8 w-8"
      />
      <span>Yuki-no</span>
    </a>
    <a
      href="https://github.com/Gumball12/yuki-no"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center text-white/80 transition-colors hover:text-white"
      aria-label="Go to GitHub repository"
    >
      <GitHubIcon class="h-6 w-6" />
    </a>
  </nav>
</header>

<main class="mb-32 w-full space-y-32 bg-black text-white">
  <!-- Hero Section -->
  <section
    class="relative flex flex-col items-center justify-center overflow-hidden px-4 pt-40"
    aria-labelledby="hero-title"
  >
    <!-- Background gradient -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent"
      aria-hidden="true"
    ></div>

    <div class="relative max-w-5xl text-center">
      <img
        src="/logo.webp"
        alt="Yuki-no logo"
        width="192"
        height="192"
        class="mx-auto mb-8 w-48"
      />

      <h1
        id="hero-title"
        class="mx-auto mb-6 max-w-4xl bg-gradient-to-r from-white to-purple-200 bg-clip-text text-4xl leading-tight font-bold text-transparent sm:text-5xl md:text-7xl"
      >
        Streamline Documentation Translation Management
      </h1>

      <p class="mx-auto mb-12 max-w-2xl text-lg text-gray-400 md:text-xl">
        A powerful GitHub Action that streamlines your translation workflow with
        automatic change tracking and release management.
      </p>

      <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button href="https://github.com/Gumball12/yuki-no">
          Get Started on GitHub
          <ArrowRightIcon
            slot="icon"
            class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
          />
        </Button>
        <Button
          href="https://github.com/Gumball12/yuki-no/blob/main/MIGRATION.md"
          variant="secondary"
        >
          Migrate to Yuki-no
        </Button>
      </div>
    </div>
  </section>

  <!-- Why Yuki-no Section -->
  <section class="relative pt-32" aria-labelledby="why-title">
    <div
      class="absolute inset-0 bg-gradient-to-b from-black via-purple-900/20 to-black"
      aria-hidden="true"
    ></div>
    <div class="relative mx-auto max-w-6xl px-4">
      <SectionTitle
        title="Why Choose Yuki-no?"
        description="Purpose-built for documentation translation projects, Yuki-no streamlines coordination and change management, helping your team focus on what matters most - the actual translation work."
      />

      <div class="my-16">
        <AutoTrackingAnimation />
      </div>

      <div class="grid gap-8 md:grid-cols-3" role="list">
        {#each features as feature}
          <Card {...feature} />
        {/each}
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="relative" aria-labelledby="features-title">
    <div class="relative mx-auto max-w-6xl px-4">
      <SectionTitle
        title="Powerful Features"
        description="Designed as a comprehensive GitHub Action for modern translation workflows, Yuki-no provides everything you need to manage your documentation translation project."
      />

      <div class="grid gap-8 md:grid-cols-3" role="list">
        {#each powerfulFeatures as feature}
          <Card {...feature} />
        {/each}
      </div>
    </div>
  </section>

  <!-- Social Proof Section -->
  <section
    class="relative border-t border-gray-800 bg-black pt-32"
    aria-labelledby="social-proof-title"
  >
    <div class="mx-auto max-w-4xl px-4 text-center">
      <h2 id="social-proof-title" class="mb-16 text-3xl font-bold md:text-4xl">
        Used in Production
      </h2>
      <div
        class="relative rounded-2xl border border-gray-800 bg-gradient-to-b from-purple-500/5 p-8"
      >
        <div class="absolute -top-4 left-1/2 -translate-x-1/2">
          <img
            src="https://vitejs.dev/logo.svg"
            alt="Vite logo"
            width="32"
            height="32"
            class="h-8 w-8"
          />
        </div>
        <p class="text-xl text-gray-300">
          Currently powering the Vite Korean documentation translation project
          through GitHub Actions
        </p>
        <a
          href="https://github.com/vitejs/docs-ko"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-6 inline-flex items-center text-purple-400 hover:text-purple-300"
        >
          View Project
          <ArrowRightIcon class="ml-2 h-5 w-5" />
        </a>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section
    class="relative border-t border-gray-800 bg-black pt-32"
    aria-labelledby="cta-title"
  >
    <div class="mx-auto max-w-4xl px-4 text-center">
      <h2 id="cta-title" class="mb-6 text-3xl font-bold md:text-4xl">
        Ready to Streamline Your Translation Workflow?
      </h2>
      <p class="mb-12 text-xl text-gray-400">
        Get started in minutes with a simple GitHub Actions workflow. No complex
        setup required.
      </p>
      <Button href="https://github.com/Gumball12/yuki-no">
        Start Using Yuki-no
        <ArrowRightIcon
          slot="icon"
          class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
        />
      </Button>
    </div>
  </section>
</main>

<!-- Footer -->
<footer class="border-t border-gray-800 bg-black py-12">
  <div class="mx-auto max-w-4xl px-4 text-center">
    <div
      class="mb-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400"
    >
      <a
        href="https://github.com/Gumball12"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-white"
      >
        Made by Gumball12
      </a>
      <span class="text-gray-700" aria-hidden="true">•</span>
      <a href="mailto:to@shj.rip" class="hover:text-white"> to@shj.rip </a>
      <span class="text-gray-700" aria-hidden="true">•</span>
      <a
        href="https://github.com/Gumball12/yuki-no"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-white"
      >
        GitHub
      </a>
    </div>

    <p class="text-sm text-gray-600">
      © {new Date().getFullYear()} Yuki-no. All rights reserved.
    </p>
  </div>
</footer>
