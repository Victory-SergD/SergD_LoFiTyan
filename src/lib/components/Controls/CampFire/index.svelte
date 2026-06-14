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
    const m = v.master ?? 1;
    currentVolume = (v.effects.campfire ?? 1) * m;
    fire.volume = currentVolume;
  });
  onDestroy(() => {
    unsub();
    fire.pause(); // don't let a looping effect outlive the component (audio-13)
  });

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

  // Global stop-all ('k'): pause this effect idempotently WITHOUT calling
  // toggleFire(), so it can never accidentally start playing. (audio-7)
  function handleStopAll() {
    if (isFire) {
      fire.pause();
      isFire = false;
    }
  }

  // Auto-DJ explicit on/off: idempotently play/pause WITHOUT calling
  // toggleFire(), so re-setting the same state can never double-trigger and
  // the DJ never silences a user-enabled effect by accident. (audio-10)
  function handleSet(e: Event) {
    const on = (e as CustomEvent).detail?.on;
    if (on && !isFire) {
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
    } else if (!on && isFire) {
      fire.pause();
      isFire = false;
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-campfire", toggleFire);
    window.addEventListener("lofi-set-campfire", handleSet);
    window.addEventListener("lofi-stop-all", handleStopAll);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-campfire", toggleFire);
      window.removeEventListener("lofi-set-campfire", handleSet);
      window.removeEventListener("lofi-stop-all", handleStopAll);
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
