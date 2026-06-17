<script lang="ts">
  import { IconCopy, IconMinus, IconSquare, IconX } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  
  let isMaximized = false;

  export let appWindow: any;
  export let noSideEffect = false;

  async function syncMaximized() {
    const maximized = await appWindow.isMaximized();
    isMaximized = maximized;
    // Remove the rounded corners when maximized
    document.body.style.borderRadius = maximized ? "0px" : "10px";
  }

  onMount(() => {
    const close = document.getElementById("close-maximaze-wl");
    const minimize = document.getElementById("minimize-wl");
    const maximize = document.getElementById("maximaze-wl");
    if (!close || !minimize || !maximize) return;

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
  <div class="minimize" id="minimize-wl">
    <IconMinus size={14} />
  </div>
  <div class="maximize" id="maximaze-wl">
    {#if isMaximized}
      <IconCopy size={14} />
    {:else}
      <IconSquare size={12} />
    {/if}
  </div>
  <div class="close" id="close-maximaze-wl">
    <IconX size={14} />
  </div>
</div>

<style>
  .controls {
    position: absolute;
    right: 35px;
    display: flex;
    gap: 15px;
    color: white;
  }
  .controls div {
    width: 18px;
    height: 18px;
    background-color: transparent;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .close:hover {
    background-color: #ff5f56;
  }
  .minimize:hover {
    background-color: #ffffff80;
  }
  .maximize:hover {
    background-color: #ffffff80;
  }
</style>