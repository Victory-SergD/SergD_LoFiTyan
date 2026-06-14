<script lang="ts">
  import { afterUpdate } from "svelte";
  import { t } from "../../locales/store";
  import { toggleLayer, setLayerVolume } from "../../stores/atmosphere";
  import type { AtmoLayer } from "../../stores/atmosphere";

  export let setMeVisible: (id: string) => void;
  export let layer: AtmoLayer = {
    id: "-1",
    name: "none",
    src: "none",
    isPlaying: false,
    volume: 0.5,
  };
  export let visibleTrackId = "-1";

  let trackItemAnimationClass = "item-hidden";

  function updateAnimation() {
    const id = Number(layer.id);
    const vis = Number(visibleTrackId);
    if (id == vis) {
      trackItemAnimationClass = "item-visible";
    } else if (id + 1 == vis) {
      trackItemAnimationClass = "item-before-visible";
    } else if (id - 1 == vis) {
      trackItemAnimationClass = "item-after-visible";
    } else if (id == 9 && vis == 1) {
      trackItemAnimationClass = "item-before-visible";
    } else if (id == 1 && vis == 9) {
      trackItemAnimationClass = "item-after-visible";
    } else {
      trackItemAnimationClass = "item-hidden";
    }
  }

  function handleVolumeChange(event: Event) {
    const v = parseFloat((event.target as HTMLInputElement).value);
    setLayerVolume(layer.id, v);
  }

  function onCardClick() {
    // Dispatch to the store; never mutate the prop (state-2).
    toggleLayer(layer.id);
    if (!layer.isPlaying) setMeVisible(layer.id);
  }

  updateAnimation();
  afterUpdate(updateAnimation);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  on:contextmenu={() => {
    if (!layer.isPlaying) setMeVisible(layer.id);
  }}
  on:click={onCardClick}
  class={"carousel__item " + trackItemAnimationClass}
>
  <div class={"carousel__item-body glass " + (layer.isPlaying ? "playing" : "")}>
    <img class="carousel__item-body__img" src="assets/images/{layer.id}.jpg" alt="" />
    <div>
      <p id="title">Track {layer.id}</p>
      <p id="info">{$t.tracks[layer.id].quote}</p>
      {#if layer.isPlaying}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={layer.volume}
          on:input={handleVolumeChange}
          on:click={(e) => e.stopPropagation()}
          id="volume-slider"
          class="volume-slider"
        />
      {/if}
    </div>
  </div>
</div>

<style>
  .carousel__item {
    display: flex;
    align-items: center;
    position: absolute;
    width: 100%;
    will-change: transform, opacity;
    transition-duration: 500ms;
  }
  .carousel__item-body {
    position: relative;
    width: 100%;
    color: white;
    border-radius: 8px;
    padding-right: 15px;
    display: flex;
    gap: 20px;
    min-width: max-content;
  }

  .carousel__item-body__img {
    width: 80px;
    min-width: 80px;
    height: 80px;
    margin: 10px;
    border-radius: 5px;
    overflow: hidden;
  }
  #title {
    font-size: 16px;
    font-weight: 600;
  }
  #info {
    display: flex;
    flex-wrap: wrap;
    font-size: 11px;
  }

  .playing {
    background-color: rgba(0, 0, 0, 60%);
  }
  .item-visible {
    opacity: 1;
    visibility: visible;
  }
  .item-hidden {
    opacity: 0.2;
    visibility: hidden;
    animation-duration: 0ms;
    transform: scale(0.1);
  }
  .item-before-visible {
    opacity: 0.5;
    visibility: visible;
    transform: scale(0.8) translate(0, -150px);
  }
  .item-after-visible {
    opacity: 0.5;
    visibility: visible;
    transform: scale(0.8) translate(0, 150px);
  }
  .volume-slider {
    position: absolute;
    bottom: 10px;
    right: 10px;
    width: 80px;
    height: 5px;
  }

  @media only screen and (max-width: 600px) {
    .carousel__item-body {
      gap: 10px;
    }
    .carousel__item-body__img {
      width: 40px;
      min-width: 40px;
      height: 40px;
    }
    #title,
    #info {
      margin: 0;
    }
    #info {
      font-size: 12px;
      max-width: 60vw;
    }
  }
</style>
