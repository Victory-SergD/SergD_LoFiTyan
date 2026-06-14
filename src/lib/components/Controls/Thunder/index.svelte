<script lang="ts">
  import { IconCloudStorm } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
  import { volumes } from "../../../stores/volume";
  import { isTypingTarget } from "../../../utils/dom";

  let storm = new Audio("assets/engine/effects/thunder.mp3");
  let isStorming = false;
  let currentVolume = 1;

  // Live volume from the store — no polling (audio-5).
  const unsub = volumes.subscribe((v) => {
    currentVolume = v.effects.thunder ?? 1;
    storm.volume = currentVolume;
  });
  onDestroy(() => unsub());

  function toggleThunder() {
    if (isStorming) {
      storm.pause();
      isStorming = false;
    } else {
      storm.loop = true;
      storm.volume = currentVolume;
      storm
        .play()
        .then(() => {
          isStorming = true;
        })
        .catch(() => {
          isStorming = false;
        });
    }
  }

  // Shortcut to toggle storm with "S" key
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;
    if (e.key === "s") {
      toggleThunder();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-thunder", toggleThunder);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-thunder", toggleThunder);
    };
  });
</script>

<button
  style={`
    background-color: ${isStorming ? "white" : "transparent"};
    `}
  on:click={toggleThunder}
>
  <IconCloudStorm size={25} color={isStorming ? "black" : "white"} />
</button>

<style>
  button {
    color: white;
    border-radius: 50%;
    aspect-ratio: 4/4;
  }
</style>
