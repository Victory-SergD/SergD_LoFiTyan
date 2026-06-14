<script lang="ts">
  // Canvas is now just the full-screen background layer behind everything.
  // (The generative-audio Visualizer was removed with the Tone.js engine.)
</script>

<div id="bg" class="canvas">
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
</style>
