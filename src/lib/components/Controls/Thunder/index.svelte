<script lang="ts">
  import { IconCloudStorm } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
  import { volumes } from "../../../stores/volume";
  import { isTypingTarget } from "../../../utils/dom";
  import { createLoop } from "../../../utils/audioLoop";

  const loop = createLoop("assets/engine/effects/thunder.mp3");
  let isStorming = false;
  let currentVolume = 1;

  // Live volume from the store — no polling (audio-5).
  const unsub = volumes.subscribe((v) => {
    const m = v.master ?? 1;
    currentVolume = (v.effects.thunder ?? 1) * m;
    loop.setVolume(currentVolume);
  });
  onDestroy(() => {
    unsub();
    loop.stop(); // don't let a looping effect outlive the component (audio-13)
  });

  function toggleThunder() {
    if (isStorming) {
      loop.stop();
      isStorming = false;
    } else {
      loop.setVolume(currentVolume);
      loop
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

  // Global stop-all ('k'): stop this effect idempotently WITHOUT calling
  // toggleThunder(), so it can never accidentally start playing. (audio-7)
  function handleStopAll() {
    if (isStorming) {
      loop.stop();
      isStorming = false;
    }
  }

  // Auto-DJ explicit on/off: idempotently play/stop WITHOUT calling
  // toggleThunder(), so re-setting the same state can never double-trigger and
  // the DJ never silences a user-enabled effect by accident. (audio-10)
  function handleSet(e: Event) {
    const on = (e as CustomEvent).detail?.on;
    if (on && !isStorming) {
      loop.setVolume(currentVolume);
      loop
        .play()
        .then(() => {
          isStorming = true;
        })
        .catch(() => {
          isStorming = false;
        });
    } else if (!on && isStorming) {
      loop.stop();
      isStorming = false;
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("lofi-toggle-thunder", toggleThunder);
    window.addEventListener("lofi-set-thunder", handleSet);
    window.addEventListener("lofi-stop-all", handleStopAll);

    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("lofi-toggle-thunder", toggleThunder);
      window.removeEventListener("lofi-set-thunder", handleSet);
      window.removeEventListener("lofi-stop-all", handleStopAll);
    };
  });
</script>

<button
  style={`
    background-color: ${isStorming ? "white" : "transparent"};
    `}
  on:click={toggleThunder}
  aria-label="Toggle thunder"
  aria-pressed={isStorming}
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
