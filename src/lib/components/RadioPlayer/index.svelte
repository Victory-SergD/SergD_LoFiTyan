<script lang="ts">
  import {
    IconList,
    IconPlayerPauseFilled,
    IconPlayerPlayFilled,
    IconPlayerTrackNextFilled,
    IconPlayerTrackPrevFilled,
  } from "@tabler/icons-svelte";
  import {
    current,
    isPlaying,
    error,
    buffering,
    togglePlay,
    playNext,
    playPrev,
    selectStation,
  } from "../../stores/radio";
  import { openPicker } from "../../stores/picker";

  function hideBrokenFavicon(e: Event) {
    (e.currentTarget as HTMLImageElement).style.display = "none";
  }
</script>

<div class="radio-player">
  {#if $error}
    <!-- Playback error; let the user retry by re-selecting the current station. -->
    <button class="station-name retry" on:click={() => { if ($current) selectStation($current); }} title="Повторить">
      ⚠ {$error} · ↻
    </button>
  {:else}
    <button class="station-name open" on:click={openPicker} title={$current?.name ?? "Stations"}>
      <IconList size={14} />
      {#if $current?.favicon && $current.favicon.startsWith("https://")}
        <img class="np-fav" src={$current.favicon} alt="" on:error={hideBrokenFavicon} />
      {/if}
      {#if $buffering}
        <span class="dot-spin" aria-hidden="true"></span> {$current?.name ?? ""}
      {:else}
        {$current?.name ?? "…"}
      {/if}
    </button>
  {/if}
  <div class="controls">
    <button class="nav-button glass" on:click={playPrev} aria-label="Previous station">
      <IconPlayerTrackPrevFilled size={20} />
    </button>
    <button
      class="play-button"
      on:click={togglePlay}
      aria-label={$isPlaying ? "Pause" : "Play"}
    >
      {#if $isPlaying}
        <IconPlayerPauseFilled size={30} />
      {:else}
        <IconPlayerPlayFilled size={30} />
      {/if}
    </button>
    <button class="nav-button glass" on:click={playNext} aria-label="Next station">
      <IconPlayerTrackNextFilled size={20} />
    </button>
  </div>
</div>

<style>
  .radio-player {
    position: fixed;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    z-index: 30;
  }

  .station-name {
    margin: 0;
    max-width: 280px;
    padding: 6px 16px;
    border-radius: 20px;
    color: white;
    font-size: 13px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(10px);
  }

  button.station-name.retry {
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  button.station-name.retry:hover {
    background: rgba(0, 0, 0, 0.45);
  }

  button.station-name.open {
    border: none;
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .np-fav {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    object-fit: cover;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .play-button {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background-color: white;
    color: black;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: box-shadow 0.2s;
  }

  .play-button:hover {
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
  }

  .nav-button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    cursor: pointer;
  }

  @media (orientation: portrait) {
    .radio-player {
      bottom: 24px;
    }
  }

  .dot-spin {
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-right: 4px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: dot-spin 0.8s linear infinite;
    vertical-align: middle;
  }
  @keyframes dot-spin {
    to { transform: rotate(360deg); }
  }
</style>
