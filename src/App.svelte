<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { dir, locale } from "./lib/locales/store";
  import {
    immersive,
    initIdleWatch,
    toggleImmersive,
    pauseIdleWatch,
    resumeIdleWatch,
  } from "./lib/stores/immersion";
  import RadioPlayer from "./lib/components/RadioPlayer/index.svelte";
  import { loadStations, togglePlay, pause } from "./lib/stores/radio";
  import Canvas from "./lib/components/Canvas/index.svelte";
  import Controls from "./lib/components/Controls/index.svelte";
  import RainAnimation from "./lib/components/Controls/Rain/RainAnimation.svelte";
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

  // Global keyboard handler for the radio + stop-all. The 'k' stop-all dispatch
  // used to live in TrackList (removed); it now broadcasts `lofi-stop-all`, which
  // the radio store and the 4 weather effects listen for. (Plain digit/word keys
  // are ignored while typing in inputs.)
  function onGlobalHotkey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && t.closest("input, textarea, select")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "k") {
      window.dispatchEvent(new CustomEvent("lofi-stop-all"));
    }
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    }
  }

  // ContextMenu dispatches `lofi-toggle-play`; route it to the radio. The radio
  // listens for `lofi-stop-all` to pause itself ('k'), alongside the weather
  // effects.
  function onTogglePlay() {
    togglePlay();
  }
  function onStopAll() {
    pause();
  }

  onMount(() => {
    cleanupIdle = initIdleWatch();
    window.addEventListener("keydown", onImmersionHotkey);
    window.addEventListener("keydown", onGlobalHotkey);
    window.addEventListener("lofi-toggle-play", onTogglePlay);
    window.addEventListener("lofi-stop-all", onStopAll);

    // Load lofi stations so the RadioPlayer is ready to play.
    void loadStations("lofi");

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
    window.removeEventListener("keydown", onGlobalHotkey);
    window.removeEventListener("lofi-toggle-play", onTogglePlay);
    window.removeEventListener("lofi-stop-all", onStopAll);
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
  <!-- Weather ambiance: rendered OUTSIDE `.chrome` so it stays visible when the
       controls auto-hide in immersive mode, like the character (BUG C). -->
  <RainAnimation />
  <!-- While the pointer is over any control, pause the auto-hide so controls are
       never hidden out from under the cursor (BUG A). -->
  <div
    class="chrome"
    on:pointerenter={pauseIdleWatch}
    on:pointerleave={resumeIdleWatch}
    on:mouseenter={pauseIdleWatch}
    on:mouseleave={resumeIdleWatch}
  >
    <Config />
    <TopBar />
    <section class="content">
      <Controls />
      <Info />
    </section>
    <!-- RadioPlayer lives inside `.chrome` so it auto-hides with the rest of the
         chrome in immersive mode, per the user's KEEP-immersion request. -->
    <RadioPlayer />
  </div>
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
    .container {
      overflow-y: auto;
      height: auto;
      min-height: 100vh;
    }

    .content {
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      gap: 16px;
      height: auto;
      min-height: 0;
      padding: 20px;
    }
  }

  .chrome {
    transition: opacity 0.4s ease;
  }

  .container.immersive .chrome {
    opacity: 0;
    pointer-events: none;
    /* Hiding fades out over 0.4s (rule above). */
    transition: opacity 0.4s ease;
  }

  /* Reveal is INSTANT: when leaving immersive mode the chrome snaps back to
     fully opaque and clickable, so a click right after the pointer wakes it
     lands on a real, opaque button (no swallowed first click). */
  .container:not(.immersive) .chrome {
    transition: none;
  }
</style>
