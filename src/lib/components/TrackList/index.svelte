<script lang="ts">
  import { IconChevronDown } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  import { atmosphere, toggleLayer, stopAll } from "../../stores/atmosphere";
  import TrackListItem from "./TrackListItem.svelte";

  let isMobileHidden = false; // Used to hide track list on mobile due to tight space
  let visibleTrackId = "1";

  function nextTrack() {
    const n = Number(visibleTrackId);
    visibleTrackId = String(n < 9 ? n + 1 : 1);
  }
  function prevTrack() {
    const n = Number(visibleTrackId);
    visibleTrackId = String(n > 1 ? n - 1 : 9);
  }

  let lastScrollTime = 0;
  const SCROLL_THROTTLE = 100; // ms

  function handleScroll(event: WheelEvent) {
    const currentTime = Date.now();
    if (currentTime - lastScrollTime < SCROLL_THROTTLE) return;
    if (event.deltaY > 0) {
      nextTrack();
      lastScrollTime = currentTime;
    } else if (event.deltaY < 0) {
      prevTrack();
      lastScrollTime = currentTime;
    }
  }

  function isTypingTarget(e: KeyboardEvent): boolean {
    const el = e.target as HTMLElement | null;
    return !!el && (el.closest("input") !== null || el.isContentEditable);
  }

  onMount(() => {
    // ONE keydown handler for digits, stop-all, and arrows (state-4).
    const handleKeydown = (e: KeyboardEvent) => {
      if (isTypingTarget(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key >= "1" && e.key <= "9") {
        toggleLayer(e.key);
        visibleTrackId = e.key;
        return;
      }
      if (e.key === "k") {
        stopAll();
        return;
      }
      if (e.key === "ArrowUp") prevTrack();
      if (e.key === "ArrowDown") nextTrack();
    };

    const handleSettingsOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.isActive !== undefined) {
        isMobileHidden = detail.isActive;
      }
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("settings-open-changed", handleSettingsOpen);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("settings-open-changed", handleSettingsOpen);
    };
  });
</script>

<div
  class={"track-list" + (isMobileHidden ? " mobile-hidden" : "")}
  on:wheel={handleScroll}
>
  <div class="wrapper">
    <div class="carousel">
      {#each $atmosphere as layer (layer.id)}
        <TrackListItem
          {layer}
          {visibleTrackId}
          setMeVisible={(id) => (visibleTrackId = id)}
        />
      {/each}
    </div>
  </div>
  <div id="btn-view">
    <button id="navigate-btn" class="glass" on:click={prevTrack}>
      <IconChevronDown />
    </button>
  </div>
</div>

<style>
  .track-list {
    width: clamp(220px, 28vw, 420px);
    height: 65vh;
    padding: 20px 10px;
    border-radius: 20px;
    z-index: 20;
  }

  .wrapper {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .carousel {
    position: relative;
    width: 100%;
    max-width: 500px;
    display: flex;
    justify-content: center;
    flex-direction: column;
  }
  #btn-view {
    width: 120%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #navigate-btn {
    width: 30px;
    height: 30px;
    color: white;
    border-radius: 99px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #navigate-btn:hover {
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  @media (orientation: portrait) {
    .track-list {
      width: 100%;
      max-width: min(92vw, 520px);
      margin: 0 auto;
      height: clamp(140px, 26vh, 240px);
    }
    #btn-view {
      width: 100%;
    }
    .mobile-hidden {
      display: none;
    }
  }
</style>
