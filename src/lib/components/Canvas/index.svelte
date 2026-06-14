<script lang="ts">
  // @ts-ignore
  import * as Tone from "tone";
  import Visualizer from "../Visualizer/index.svelte";
</script>

<div id="bg" class="canvas">
  <div class="canvas-visualizer">
    <Visualizer audio={Tone.Master} />
  </div>
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

  .canvas-visualizer {
    position: absolute;
    left: clamp(12px, 3vw, 30px);
    bottom: clamp(12px, 3vh, 30px);
    height: clamp(90px, 18vh, 180px);
    width: clamp(160px, 40vw, 320px);
    overflow: hidden;
    z-index: 1;
  }

  /* Portrait (variant B): make the visualizer a SHORT, subtle bar hugging the
     very bottom of the screen, sitting behind the compact play dock so it never
     clutters the center over the character. It stays at z-index:1, behind the
     controls (z-index:30), and its reduced height keeps the bottom dock tight. */
  @media (orientation: portrait) {
    .canvas-visualizer {
      left: 50%;
      transform: translateX(-50%);
      bottom: clamp(10px, 2vh, 20px);
      height: clamp(48px, 8vh, 72px);
      width: min(72vw, 280px);
      opacity: 0.55;
    }
  }
</style>
