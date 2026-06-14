<script lang="ts">
  import { rainActive } from "../../../stores/weather";

  // Full-screen rain ambiance. Rendered OUTSIDE `.chrome` (as a sibling of the
  // Canvas) so it persists when the controls auto-hide in immersive mode, like
  // the character art (BUG C). Reads the shared store directly.
</script>

{#if $rainActive}
  <div class="rain" aria-hidden="true" />
{/if}

<style>
  .rain {
    position: absolute;
    top: -30px;
    left: -100vw;
    width: 300vw;
    height: 110vh;
    /* Ambiance layer: above the Canvas background (z-index:0) but below the
       chrome content (z-index:20+). Independent of the chrome opacity fade. */
    z-index: 5;
    pointer-events: none;
    background: url("/rain.png");
    animation: rain 0.3s linear infinite;
  }

  @keyframes rain {
    0% {
      background-position: 0px 0px;
    }
    100% {
      background-position: 150px 400px;
    }
  }
</style>
