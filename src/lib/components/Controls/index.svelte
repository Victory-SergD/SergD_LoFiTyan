<script lang="ts">
  import CampFire from "./CampFire/index.svelte";
  import Jungle from "./Jungle/index.svelte";
  import Rain from "./Rain/index.svelte";
  import Settings from "./Settings/index.svelte";
  import Thunder from "./Thunder/index.svelte";

  // Effect children read their own volume from the store; no polling here (audio-5).
</script>

<div class="controls glass">
  <Rain />
  <Thunder />
  <Jungle />
  <CampFire />
  <Settings />
</div>

<style>
  .controls {
    width: 340px;
    height: 50px;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    border-radius: 50px;
  }

  @media (orientation: portrait) {
    .controls {
      width: min(85vw, 420px);
      margin: 0 auto;
    }
  }
</style>
