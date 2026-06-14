<script lang="ts">
  import { IconCloudRain } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
  import { volumes } from "../../../stores/volume";
  import { isTypingTarget } from "../../../utils/dom";
  import RainAnimation from "./RainAnimation.svelte";

  let rain = new Audio("assets/engine/effects/rain.mp3");
  let isRaining = false;
  let currentVolume = 1;

  // Live volume from the store — no polling (audio-5).
  const unsub = volumes.subscribe((v) => {
    const m = v.master ?? 1;
    currentVolume = (v.effects.rain ?? 1) * m;
    rain.volume = currentVolume;
  });
  onDestroy(() => {
    unsub();
    rain.pause(); // don't let a looping effect outlive the component (audio-13)
  });

  function toggleRain() {
    if (isRaining) {
      rain.pause();
      isRaining = false;
    } else {
      rain.loop = true;
      rain.volume = currentVolume;
      rain
        .play()
        .then(() => {
          isRaining = true;
        })
        .catch(() => {
          isRaining = false;
        });
    }
  }

  // Global stop-all ('k'): pause this effect idempotently WITHOUT calling
  // toggleRain(), so it can never accidentally start playing. (audio-7)
  function handleStopAll() {
    if (isRaining) {
      rain.pause();
      isRaining = false;
    }
  }

  // Auto-DJ explicit on/off: idempotently play/pause WITHOUT calling
  // toggleRain(), so re-setting the same state can never double-trigger and
  // the DJ never silences a user-enabled effect by accident. (audio-10)
  function handleSet(e: Event) {
    const on = (e as CustomEvent).detail?.on;
    if (on && !isRaining) {
      rain.loop = true;
      rain.volume = currentVolume;
      rain
        .play()
        .then(() => {
          isRaining = true;
        })
        .catch(() => {
          isRaining = false;
        });
    } else if (!on && isRaining) {
      rain.pause();
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
  >
    <IconCloudRain size={25} color={isRaining ? "black" : "white"} />
  </button>
  <RainAnimation {isRaining} />
</div>

<style>
  button {
    color: white;
    border-radius: 50%;
    aspect-ratio: 4/4;
  }
</style>
