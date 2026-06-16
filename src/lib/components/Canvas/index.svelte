<script lang="ts">
  // Canvas is now just the full-screen background layer behind everything.
  // (The generative-audio Visualizer was removed with the Tone.js engine.)
  import { bgMedia, bgMediaError, setBgError } from "../../stores/background";
  import { t } from "../../locales/store";
</script>

<div id="bg" class="canvas">
  {#if $bgMedia}
    {#if $bgMedia.kind === "video"}
      <video class="bg-media" src={$bgMedia.src}
        style="object-position:{$bgMedia.focalX}% {$bgMedia.focalY}%; transform:scale({$bgMedia.scale}); transform-origin:{$bgMedia.focalX}% {$bgMedia.focalY}%"
        autoplay loop muted playsinline on:error={setBgError}></video>
    {:else}
      <img class="bg-media" src={$bgMedia.src} alt=""
        style="object-position:{$bgMedia.focalX}% {$bgMedia.focalY}%; transform:scale({$bgMedia.scale}); transform-origin:{$bgMedia.focalX}% {$bgMedia.focalY}%" />
    {/if}
  {/if}
  {#if $bgMediaError}
    <div class="bg-error">{$t.canvas.video_unavailable}</div>
  {/if}
  <slot />
</div>

<style>
  .canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    background-color: #0a0a0a;
  }

  .bg-media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }

  .bg-error {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: rgba(0, 0, 0, 0.55);
    font-size: 14px;
    text-align: center;
    padding: 20px;
  }
</style>
