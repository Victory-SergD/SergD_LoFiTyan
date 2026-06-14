<script lang="ts">
  import { t } from "../../../locales/store";
  import { autoDjMode, setAutoDjMode } from "../../../stores/autodj";
  import type { AutoDjMode } from "../../../stores/autodj";

  $: MODES = [
    { id: "MUSIC" as AutoDjMode, label: $t.settings.autodj.modes.music.label, desc: $t.settings.autodj.modes.music.desc },
    { id: "ATMOSPHERE" as AutoDjMode, label: $t.settings.autodj.modes.atmosphere.label, desc: $t.settings.autodj.modes.atmosphere.desc },
    { id: "WORLD" as AutoDjMode, label: $t.settings.autodj.modes.world.label, desc: $t.settings.autodj.modes.world.desc },
    { id: "MANUAL" as AutoDjMode, label: $t.settings.autodj.modes.manual.label, desc: $t.settings.autodj.modes.manual.desc },
  ];

  function updateMode(newMode: AutoDjMode) {
    setAutoDjMode(newMode);
  }
</script>

<div class="auto-dj-container">
  <h4>{$t.settings.autodj.title}</h4>
  <div class="modes">
    {#each MODES as m}
      <button
        class:active={$autoDjMode === m.id}
        on:click={() => updateMode(m.id)}
        data-tooltip={m.desc}
      >
        {m.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .auto-dj-container {
    margin-top: 20px;
    margin-bottom: 20px;
  }

  h4 {
    margin-left: 10px;
    margin-bottom: 10px;
  }

  .modes {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0 10px;
  }

  button {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9em;
    transition: all 0.2s;
  }

  button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  button.active {
    background: white;
    color: black;
    border-color: white;
    font-weight: bold;
  }
</style>
