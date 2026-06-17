<script lang="ts">
  import { IconEye, IconEyeOff, IconX } from "@tabler/icons-svelte";
  import ShortCuts from "./ShortCuts.svelte";
  import SocialLinks from "./SocialLinks.svelte";
  import { onMount } from "svelte";
  import { t } from "../../locales/store";
  import { infoOpen } from "../../stores/ui";

  let visible = false;

  // Reflects "will the info box show on next launch?":
  // true when the shownBefore-info flag is ABSENT.
  let showOnStart = !localStorage.getItem("shownBefore-info");

  function toggleInfoBox() {
    visible = !visible;
    infoOpen.set(visible);
  }

  // First time, show info box
  if (showOnStart) {
    toggleInfoBox();
    localStorage.setItem("shownBefore-info", "true");
    showOnStart = false;
  }

  function toggleShowOnStart() {
    showOnStart = !showOnStart;
    if (showOnStart) {
      // box WILL show next launch -> remove the "already shown" flag
      localStorage.removeItem("shownBefore-info");
    } else {
      // box will NOT show next launch
      localStorage.setItem("shownBefore-info", "true");
    }
  }

  onMount(() => {
    // Listen to escape key to close info box
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && visible) {
        toggleInfoBox();
      }
    };
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("lofi-toggle-info", toggleInfoBox);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("lofi-toggle-info", toggleInfoBox);
    };
  });
</script>

{#if visible}
  <div class="info-overlay glass">
    <div id="info-box" class="glass">
      <div id="top-section">
        <button id="close-btn" on:click={toggleInfoBox}>
          <IconX color="white" size={17} />
        </button>
        <button
          id="show-btn"
          class:active={showOnStart}
          data-tooltip={showOnStart
            ? $t.info.buttons.shown_next_time
            : $t.info.buttons.show_next_time}
          on:click={toggleShowOnStart}
        >
          {#if showOnStart}
            <IconEye color="white" size={17} />
          {:else}
            <IconEyeOff color="white" size={17} />
          {/if}
        </button>
        <div id="app-info">
          <img id="app-logo" src="lofityan-logo.png" alt="LoFiTyan" />
          <div>
            <h1>{$t.info.title}</h1>
            <p id="version">Version 1.0.0-beta.2</p>
            <p id="tagline">
              {$t.info.tagline}
            </p>
            <SocialLinks />
          </div>
        </div>
      </div>
      <div id="bottom-section">
        <ShortCuts />
      </div>
    </div>
  </div>
{/if}

<style>
  .info-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99; /* on top of everything and under topbar(100 z-index) */
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #info-box {
    padding: 0px 15px;
    color: white;
    border-radius: 20px;
    width: 60vw;
    height: 88vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  #top-section {
    display: flex;
    justify-content: space-between;
    margin-top: 5px;
    position: relative;
    flex-shrink: 0;
  }
  #close-btn {
    position: absolute;
    top: 10px;
    right: 0;
    outline: none;
  }
  #show-btn {
    position: absolute;
    top: 10px;
    right: 35px;
    outline: none;
  }
  button:active {
    transform: scale(0.9);
  }
  #app-info {
    display: flex;
    padding: 10px;
    gap: 20px;
  }
  #app-info h1 {
    margin: 10px 0px 5px 0px;
  }
  #app-info #version {
    font-size: x-small;
    margin: -2px 10px;
    color: lightgray;
  }
  #app-info #tagline {
    font-size: small;
    margin: 5px 10px;
  }
  #bottom-section {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  img {
    aspect-ratio: 1/1;
    width: 130px;
    height: 130px;
    min-width: 130px;
    min-height: 130px;
    border-radius: 20px;
  }

  @media only screen and (max-width: 480px) {
    #info-box {
      width: 90vw;
    }
    #app-info {
      margin-top: 20px;
      flex-direction: column;
    }
    img {
      width: 80px;
      height: 80px;
      min-width: auto;
      min-height: auto;
      align-self: center;
    }
    #app-info h1 {
      font-size: large;
    }
    #bottom-section {
      display: none;
    }
  }
</style>
