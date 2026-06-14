<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { IconArrowsMaximize } from "@tabler/icons-svelte";
  import { dir, locale } from "./lib/locales/store";
  import { immersive, initIdleWatch, toggleImmersive } from "./lib/stores/immersion";
  import PlayButton from "./lib/PlayButton.svelte";
  import TrackList from "./lib/components/TrackList/index.svelte";
  import Canvas from "./lib/components/Canvas/index.svelte";
  import Controls from "./lib/components/Controls/index.svelte";
  import TopBar from "./lib/components/TopBar/TopBar.svelte";
  import Info from "./lib/components/InfoBox/Info.svelte";
  import Config from "./lib/Config.svelte";
  import ContextMenu from "./lib/components/ContextMenu/ContextMenu.svelte";
  import Tooltip from "./lib/components/Tooltip.svelte";

  let cleanupIdle: (() => void) | null = null;

  function onImmersionHotkey(e: KeyboardEvent) {
    // Ctrl/Cmd + I toggles immersive mode; ignore while typing in inputs
    const t = e.target as HTMLElement | null;
    if (t && t.closest("input, textarea, select")) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      toggleImmersive();
    }
  }

  onMount(() => {
    cleanupIdle = initIdleWatch();
    window.addEventListener("keydown", onImmersionHotkey);

    // Initialize direction
    document.documentElement.dir = $dir;
    document.documentElement.lang = $locale;

    const bgEl = document.getElementById("bg");
    const bgType = localStorage.getItem("bg-type") || "default";

    if (bgEl) {
      if (bgType === "custom") {
        const customBgId = localStorage.getItem("custom-bg-id");
        if (customBgId) {
          import("./lib/localDB").then(async ({ default: localDB }) => {
            const saved = await localDB.getItem("custom-backgrounds");
            if (saved) {
              const customs = JSON.parse(saved) as Array<{ id: string; dataUrl: string }>;
              const match   = customs.find((b) => b.id === customBgId);
              if (match) {
                const img  = new Image();
                img.onload = () => {
                  bgEl.style.backgroundImage = `url('${match.dataUrl}')`;
                };
                img.src = match.dataUrl;
              }
            }
          });
        }
      } else {
        const id  = localStorage.getItem("bg-id") || "1";
        const src = `assets/background/bg${id}.webp`;
        const img = new Image();
        img.onload = () => {
          bgEl.style.backgroundImage = `url('${src}')`;
        };
        img.src = src;
      }
    }
  });

  onDestroy(() => {
    if (cleanupIdle) cleanupIdle();
    window.removeEventListener("keydown", onImmersionHotkey);
  });

  $: {
    if (typeof document !== "undefined") {
      document.documentElement.dir = $dir;
      document.documentElement.lang = $locale;
    }
  }
</script>

<main class="container" class:immersive={$immersive}>
  <Canvas />
  <div class="chrome">
    <Config />
    <TopBar />
    <button
      class="immersion-toggle glass"
      class:active={$immersive}
      title="Просторный режим (Ctrl/Cmd+I)"
      aria-label="Просторный режим"
      on:click={toggleImmersive}
    >
      <IconArrowsMaximize size={18} />
    </button>
    <section class="content">
      <TrackList />
      <Controls />
      <Info />
    </section>
  </div>
  <PlayButton />
  <ContextMenu />
  <Tooltip />
</main>

<style>
  .container {
    max-width: 100vw;
    min-height: 100vh;
    height: 100vh;
    position: relative;
    overflow: hidden;
  }

  .content {
    padding: 24px;
    padding-top: 30px;
    height: 100vh;
    position: relative;
    z-index: 20;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  @media (orientation: portrait) {
    .content {
      flex-direction: column;
      justify-content: flex-end;
      align-items: stretch;
      gap: 16px;
      height: auto;
      min-height: 100vh;
    }
  }

  .chrome {
    transition: opacity 0.4s ease;
  }

  .container.immersive .chrome {
    opacity: 0;
    pointer-events: none;
  }

  .immersion-toggle {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 40;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .immersion-toggle.active {
    color: #9ad0ff;
  }
</style>
