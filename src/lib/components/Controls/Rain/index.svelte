<script lang="ts">
  import { IconCloudRain } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
  import { volumes } from "../../../stores/volume";
  import RainAnimation from "./RainAnimation.svelte";

  let rain = new Audio("assets/engine/effects/rain.mp3");
  let isRaining = false;
  let currentVolume = 1;

  // Live volume from the store — no polling (audio-5).
  const unsub = volumes.subscribe((v) => {
    currentVolume = v.effects.rain ?? 1;
    rain.volume = currentVolume;
  });
  onDestroy(() => unsub());

  function toggleRain() {
    if (isRaining) {
      rain.pause();
    } else {
      rain.loop = true;
      rain.volume = currentVolume;
      rain.play();
    }
    isRaining = !isRaining;
  }

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest("input")) return;
      if (e.key === "a") toggleRain();
    };
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("lofi-toggle-rain", toggleRain);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("lofi-toggle-rain", toggleRain);
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
