<script lang="ts">
  import { IconCampfire } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
  import { volumes } from "../../../stores/volume";
  import { isTypingTarget } from "../../../utils/dom";

  let fire = new Audio("assets/engine/effects/fire.mp3");
  let isFire = false;
  let currentVolume = 1;

  // Live volume from the store — no polling (audio-5).
  const unsub = volumes.subscribe((v) => {
    currentVolume = v.effects.campfire ?? 1;
    fire.volume = currentVolume;
  });
  onDestroy(() => unsub());

  function toggleFire() {
    if (isFire) {
      fire.pause();
      isFire = false;
    } else {
      fire.loop = true;
      fire.volume = currentVolume;
      fire
        .play()
        .then(() => {
          isFire = true;
        })
        .catch(() => {
          isFire = false;
        });
    }
  }

  // Shortcut to toggle fire with "F" key
  function onKeydown(e: KeyboardEvent) {
    if (isTypingTarget(e)) return;
    if (e.key === "f") {
      toggleFire();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-campfire", toggleFire);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-campfire", toggleFire);
    };
  });
</script>

<button
  style={`
        background-color: ${isFire ? "white" : "transparent"};
        `}
  on:click={toggleFire}
>
  <IconCampfire size={25} color={isFire ? "black" : "white"} />
</button>

<style>
  button {
    color: white;
    border-radius: 50%;
    aspect-ratio: 4/4;
  }
</style>
