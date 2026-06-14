<script lang="ts">
  import { onMount } from "svelte";

  let isMaximized = false;
  export let appWindow;
  export let noSideEffect = false;

  async function syncMaximized() {
    const maximized = await appWindow.isMaximized();
    isMaximized = maximized;
    // Remove the rounded corners when maximized
    document.body.style.borderRadius = maximized ? "0px" : "10px";
  }

  onMount(() => {
    const close = document.getElementById("close-mac");
    const minimize = document.getElementById("minimize-mac");
    const maximize = document.getElementById("maximize-mac");

    const onClose = () => appWindow.close();
    const onMinimize = () => appWindow.minimize();
    const onMaximize = async () => {
      const maximized = await appWindow.isMaximized();
      if (maximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
      await syncMaximized();
    };

    close.addEventListener("click", onClose);
    minimize.addEventListener("click", onMinimize);
    maximize.addEventListener("click", onMaximize);

    // initial state + watch for changes from other sources (resize, OS)
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!noSideEffect) {
      syncMaximized();
      interval = setInterval(syncMaximized, 300);
    }

    return () => {
      close.removeEventListener("click", onClose);
      minimize.removeEventListener("click", onMinimize);
      maximize.removeEventListener("click", onMaximize);
      if (interval) clearInterval(interval);
    };
  });
</script>

<div class="controls">
  <div class="close" id="close-mac" />
  <div class="minimize" id="minimize-mac" />
  <div class="maximize" id="maximize-mac" />
</div>

<style>
  .controls {
    display: flex;
    gap: 15px;
  }
  .close {
    width: 13px;
    height: 13px;
    background-color: #ff5f56;
    cursor: pointer;
    border-radius: 50%;
  }
  .minimize {
    width: 13px;
    height: 13px;
    background-color: #ffbd2e;
    cursor: pointer;
    border-radius: 50%;
  }
  .maximize {
    width: 13px;
    height: 13px;
    background-color: #27c93f;
    cursor: pointer;
    border-radius: 50%;
  }
  .maximize:hover {
    background-color: #1e9c30;
  }
  .minimize:hover {
    background-color: #e0a800;
  }
  .close:hover {
    background-color: #d63000;
  }
</style>
