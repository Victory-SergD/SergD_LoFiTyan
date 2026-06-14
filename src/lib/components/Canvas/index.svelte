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

  @media (orientation: portrait) {
    .canvas-visualizer {
      left: 50%;
      transform: translateX(-50%);
      bottom: 240px;
      width: min(80vw, 320px);
    }
  }
</style>
