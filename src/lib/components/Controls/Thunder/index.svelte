<script lang="ts">
  import { IconCloudStorm } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  import { isTypingTarget } from "../../../utils/dom";

  export let volume: number;

  let storm = new Audio("assets/engine/effects/thunder.mp3");
  let isStorming = false;

  function toggleThunder() {
    if (isStorming) {
      storm.pause();
      isStorming = false;
    } else {
      storm.loop = true;
      storm.volume = volume;
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
    const volumeTimer = setInterval(() => {
      storm.volume = volume;
    }, 100);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-thunder", toggleThunder);
      clearInterval(volumeTimer);
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
