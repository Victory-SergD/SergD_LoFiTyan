<script lang="ts">
  import { IconCampfire } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  import { isTypingTarget } from "../../../utils/dom";

  export let volume: number;

  let fire = new Audio("assets/engine/effects/fire.mp3");
  let isFire = false;

  function toggleFire() {
    if (isFire) {
      fire.pause();
      isFire = false;
    } else {
      fire.loop = true;
      fire.volume = volume;
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
    const volumeTimer = setInterval(() => {
      fire.volume = volume;
    }, 100);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-campfire", toggleFire);
      clearInterval(volumeTimer);
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
