<script lang="ts">
  import { IconCloudRain } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
  import { volumes } from "../../../stores/volume";
  import { rainActive } from "../../../stores/weather";
  import { isTypingTarget } from "../../../utils/dom";
  import { createLoop } from "../../../utils/audioLoop";

  const loop = createLoop("assets/engine/effects/rain.mp3");
  let isRaining = false;
  let currentVolume = 1;

  // Mirror local on/off state into the shared store so the full-screen rain
  // VISUAL can render OUTSIDE `.chrome` and stay visible in immersive mode,
  // while this BUTTON stays in the dock and fades with the chrome (BUG C).
  $: rainActive.set(isRaining);

  // Live volume from the store — no polling (audio-5).
  const unsub = volumes.subscribe((v) => {
    const m = v.master ?? 1;
    currentVolume = (v.effects.rain ?? 1) * m;
    loop.setVolume(currentVolume);
  });
  onDestroy(() => {
    unsub();
    loop.stop(); // don't let a looping effect outlive the component (audio-13)
  });

  function toggleRain() {
    if (isRaining) {
      loop.stop();
      isRaining = false;
    } else {
      loop.setVolume(currentVolume);
      loop
        .play()
        .then(() => {
          isRaining = true;
        })
        .catch(() => {
          isRaining = false;
        });
    }
  }

  // Global stop-all ('k'): stop this effect idempotently WITHOUT calling
  // toggleRain(), so it can never accidentally start playing. (audio-7)
  function handleStopAll() {
    if (isRaining) {
      loop.stop();
      isRaining = false;
    }
  }

  // Auto-DJ explicit on/off: idempotently play/stop WITHOUT calling
  // toggleRain(), so re-setting the same state can never double-trigger and
  // the DJ never silences a user-enabled effect by accident. (audio-10)
  function handleSet(e: Event) {
    const on = (e as CustomEvent).detail?.on;
    if (on && !isRaining) {
      loop.setVolume(currentVolume);
      loop
        .play()
        .then(() => {
          isRaining = true;
        })
        .catch(() => {
          isRaining = false;
        });
    } else if (!on && isRaining) {
      loop.stop();
      isRaining = false;
    }
  }

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;
      if (e.key === "a") toggleRain();
    };
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("lofi-toggle-rain", toggleRain);
    window.addEventListener("lofi-set-rain", handleSet);
    window.addEventListener("lofi-stop-all", handleStopAll);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("lofi-toggle-rain", toggleRain);
      window.removeEventListener("lofi-set-rain", handleSet);
      window.removeEventListener("lofi-stop-all", handleStopAll);
    };
  });
</script>

<div>
  <button
    style={`
      background-color: ${isRaining ? "white" : "transparent"};
      `}
    on:click={toggleRain}
    aria-label="Toggle rain"
    aria-pressed={isRaining}
  >
    <IconCloudRain size={25} color={isRaining ? "black" : "white"} />
  </button>
</div>

<style>
  button {
    color: white;
    border-radius: 50%;
    aspect-ratio: 4/4;
  }
</style>
