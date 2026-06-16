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
  import StationPicker from "./lib/components/StationPicker/index.svelte";
  import { initRadio, togglePlay, pause } from "./lib/stores/radio";
  import { fullscreen, exitFullscreen, initFullscreenSync } from "./lib/stores/fullscreen";
  import { closePicker } from "./lib/stores/picker";
  import { isTypingTarget } from "./lib/utils/dom";
  import Canvas from "./lib/components/Canvas/index.svelte";
  import { setVideoBg } from "./lib/stores/background";
  import Controls from "./lib/components/Controls/index.svelte";
  import RainAnimation from "./lib/components/Controls/Rain/RainAnimation.svelte";
  import TopBar from "./lib/components/TopBar/TopBar.svelte";
  import Info from "./lib/components/InfoBox/Info.svelte";
  import Config from "./lib/Config.svelte";
  import ContextMenu from "./lib/components/ContextMenu/ContextMenu.svelte";
  import Tooltip from "./lib/components/Tooltip.svelte";

  let cleanupIdle: (() => void) | null = null;
  let cleanupFs: (() => void) | null = null;

  function onImmersionHotkey(e: KeyboardEvent) {
    // Ctrl/Cmd + I toggles immersive mode; ignore while typing in inputs
    if (isTypingTarget(e)) return;
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
    // Escape must work regardless of focus (e.g. a focused volume slider).
    if (e.key === "Escape") {
      closePicker();
      void exitFullscreen();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
      e.preventDefault();
      window.location.reload();
      return;
    }
    if (isTypingTarget(e)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "k") {
      window.dispatchEvent(new CustomEvent("lofi-stop-all"));
    }
    if (e.code === "Space") {
      // A focused button activates natively on Space; don't also toggle play.
      if (t && t.closest("button")) return;
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
    void initFullscreenSync().then((fn) => (cleanupFs = fn));
    window.addEventListener("keydown", onImmersionHotkey);
    window.addEventListener("keydown", onGlobalHotkey);
    window.addEventListener("lofi-toggle-play", onTogglePlay);
    window.addEventListener("lofi-stop-all", onStopAll);

    initRadio();

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
              const customs = JSON.parse(saved) as Array<{
                id: string;
                dataUrl?: string;
                kind?: string;
                path?: string;
                focalX?: number;
                focalY?: number;
              }>;
              const match = customs.find((b) => b.id === customBgId);
              if (match) {
                if (match.kind === "video" && match.path) {
                  setVideoBg(match.path, match.focalX ?? 50, match.focalY ?? 50);
                } else if (match.dataUrl) {
                  const img  = new Image();
                  img.onload = () => {
                    bgEl.style.backgroundImage = `url('${match.dataUrl}')`;
                  };
                  img.src = match.dataUrl;
                }
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
    cleanupFs?.();
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

<main class="container" class:immersive={$immersive} class:fullscreen={$fullscreen}>
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
  <!-- StationPicker lives OUTSIDE .chrome so it is never hidden/disabled by the
       auto-hide (immersive opacity:0 + pointer-events:none). -->
  <StationPicker />
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

  /* In real fullscreen the custom titlebar would leave a strip across the top,
     so hide it — the scene goes truly edge-to-edge. The controls dock (in
     `.chrome`) still reappears on pointer move, so the exit-fullscreen button
     and Esc remain reachable. */
  .container.fullscreen :global(.titlebar) {
    display: none;
  }
</style>
