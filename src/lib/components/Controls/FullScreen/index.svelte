<script lang="ts">
  import { IconMaximize, IconMinimize } from "@tabler/icons-svelte";
  import { fullscreen, toggleFullscreen } from "../../../stores/fullscreen";
</script>

<button
  on:click={toggleFullscreen}
  aria-label={$fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
>
  {#if $fullscreen}
    <IconMinimize size={25} color="white" />
  {:else}
    <IconMaximize size={25} color="white" />
  {/if}
</button>

<style>
  button {
    color: white;
    border-radius: 50%;
    aspect-ratio: 4/4;
  }
</style>
