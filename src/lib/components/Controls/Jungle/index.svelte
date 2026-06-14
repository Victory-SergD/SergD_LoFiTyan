<script lang="ts">
  import { IconTrees } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  import { isTypingTarget } from "../../../utils/dom";

  export let volume: number;

  let jungle = new Audio("assets/engine/effects/jungle.mp3");
  let isActive = false;

  function toggleJungle() {
    if (isActive) {
      jungle.pause();
      isActive = false;
    } else {
      jungle.loop = true;
      jungle.volume = volume;
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
    const volumeTimer = setInterval(() => {
      jungle.volume = volume;
    }, 100);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-jungle", toggleJungle);
      clearInterval(volumeTimer);
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
