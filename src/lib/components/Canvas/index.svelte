<script lang="ts">
  // Canvas is now just the full-screen background layer behind everything.
  // (The generative-audio Visualizer was removed with the Tone.js engine.)
  import { videoBg } from "../../stores/background";
  import { convertFileSrc } from "@tauri-apps/api/core";
</script>

<div id="bg" class="canvas">
  {#if $videoBg}
    <video
      class="bg-video"
      src={convertFileSrc($videoBg.path)}
      style="object-position: {$videoBg.focalX}% {$videoBg.focalY}%"
      autoplay
      loop
      muted
      playsinline
    ></video>
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
    transition: background-image 0.3s ease;
  }

  .bg-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }
</style>
