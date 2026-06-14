<script lang="ts">
  import { IconTrees } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
  import { volumes } from "../../../stores/volume";
  import { isTypingTarget } from "../../../utils/dom";

  let jungle = new Audio("assets/engine/effects/jungle.mp3");
  let isActive = false;
  let currentVolume = 1;

  // Live volume from the store — no polling (audio-5).
  const unsub = volumes.subscribe((v) => {
    currentVolume = v.effects.jungle ?? 1;
    jungle.volume = currentVolume;
  });
  onDestroy(() => unsub());

  function toggleJungle() {
    if (isActive) {
      jungle.pause();
      isActive = false;
    } else {
      jungle.loop = true;
      jungle.volume = currentVolume;
      jungle
        .play()
        .then(() => {
          isActive = true;
        })
        .catch(() => {
          isActive = false;
        });
    }
  }

  // Shortcut to toggle jungle with "D" key
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;
    if (e.key === "d") {
      toggleJungle();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-jungle", toggleJungle);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-jungle", toggleJungle);
    };
  });
</script>

<button
  style={`
        background-color: ${isActive ? "white" : "transparent"};
        `}
  on:click={toggleJungle}
>
  <IconTrees size={25} color={isActive ? "black" : "white"} />
</button>

<style>
  button {
    color: white;
    border-radius: 50%;
    aspect-ratio: 4/4;
  }
</style>
