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
  onDestroy(() => {
    unsub();
    jungle.pause(); // don't let a looping effect outlive the component (audio-13)
  });

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

  // Global stop-all ('k'): pause this effect idempotently WITHOUT calling
  // toggleJungle(), so it can never accidentally start playing. (audio-7)
  function handleStopAll() {
    if (isActive) {
      jungle.pause();
      isActive = false;
    }
  }

  // Auto-DJ explicit on/off: idempotently play/pause WITHOUT calling
  // toggleJungle(), so re-setting the same state can never double-trigger and
  // the DJ never silences a user-enabled effect by accident. (audio-10)
  function handleSet(e: Event) {
    const on = (e as CustomEvent).detail?.on;
    if (on && !isActive) {
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
    } else if (!on && isActive) {
      jungle.pause();
      isActive = false;
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-jungle", toggleJungle);
    window.addEventListener("lofi-set-jungle", handleSet);
    window.addEventListener("lofi-stop-all", handleStopAll);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-jungle", toggleJungle);
      window.removeEventListener("lofi-set-jungle", handleSet);
      window.removeEventListener("lofi-stop-all", handleStopAll);
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
