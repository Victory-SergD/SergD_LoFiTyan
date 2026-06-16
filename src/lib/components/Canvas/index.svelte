<script lang="ts">
  // Canvas is now just the full-screen background layer behind everything.
  // (The generative-audio Visualizer was removed with the Tone.js engine.)
  import { bgMedia } from "../../stores/background";
</script>

<div id="bg" class="canvas">
  {#if $bgMedia}
    {#if $bgMedia.kind === "video"}
      <video class="bg-media" src={$bgMedia.src}
        style="object-position:{$bgMedia.focalX}% {$bgMedia.focalY}%; transform:scale({$bgMedia.scale}); transform-origin:{$bgMedia.focalX}% {$bgMedia.focalY}%"
        autoplay loop muted playsinline></video>
    {:else}
      <img class="bg-media" src={$bgMedia.src} alt=""
        style="object-position:{$bgMedia.focalX}% {$bgMedia.focalY}%; transform:scale({$bgMedia.scale}); transform-origin:{$bgMedia.focalX}% {$bgMedia.focalY}%" />
    {/if}
  {/if}
  <slot />
</div>

<style>
  .canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    background-color: #0a0a0a;
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
  }

  .bg-media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }
</style>
