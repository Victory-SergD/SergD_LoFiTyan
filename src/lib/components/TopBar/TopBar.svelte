<script lang="ts">
  import { onMount } from "svelte";
  import MacControls from "./MacControls.svelte";
  import GenericControls from "./GenericControls.svelte";

  let appWindow = {
    close: () => {},
    minimize: () => {},
    maximize: () => {},
    unmaximize: () => {},
    isMaximized: async () => false,
  };

  let barType = "hidden" as "mac" | "generic" | "hidden";
  let ready = false; // true once a real appWindow is bound
  let noSideEffect = false; // Disable app controls changes side effects

  onMount(async () => {
    const userAgent = navigator.userAgent || "";
    const platform = navigator.platform || "";

    const isTauri = "__TAURI_INTERNALS__" in window;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
    noSideEffect = isMobile || !isTauri;

    if (!isTauri) {
      barType = "hidden";
      return;
    }

    try {
      const { getCurrentWebviewWindow } = await import(
        "@tauri-apps/api/webviewWindow"
      );
      appWindow = getCurrentWebviewWindow();
      ready = true;
    } catch (_e) {
      ready = false;
    }

    barType = platform.includes("Mac") ? "mac" : "generic";
  });
</script>

{#if barType !== "hidden"}
  <div class="titlebar glass" data-tauri-drag-region>
    {#if barType == "mac" && ready}
      <MacControls {noSideEffect} {appWindow} />
    {/if}
    <div class="drag" data-tauri-drag-region>
      <img src="assets/dots.svg" alt="logo" width="18" />
    </div>
    {#if barType == "generic" && ready}
      <GenericControls {noSideEffect} {appWindow} />
    {/if}
  </div>
{/if}

<style>
  .titlebar {
    position: absolute;
    width: 100%;
    height: 26px;
    z-index: 100;
    padding: 0 10px;
    display: flex;
    align-items: center;
  }
  .drag {
    cursor: grab;
    margin: auto;
    opacity: 80%;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 5px;
  }
  .drag:hover {
    opacity: 100%;
  }
</style>
