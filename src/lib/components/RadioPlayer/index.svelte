<script lang="ts">
  import {
    IconPlayerPauseFilled,
    IconPlayerPlayFilled,
    IconPlayerTrackNextFilled,
    IconPlayerTrackPrevFilled,
  } from "@tabler/icons-svelte";
  import {
    current,
    isPlaying,
    togglePlay,
    playNext,
    playPrev,
  } from "../../stores/radio";
</script>

<div class="radio-player">
  <p class="station-name" title={$current?.name ?? ""}>
    {$current?.name ?? "…"}
  </p>
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
</style>
