<script lang="ts">
  import { onMount } from "svelte";

  let visible = false;
  let text = "";
  let x = 0;
  let y = 0;
  let tooltipWidth = 0;
  let tooltipHeight = 0;

  let targetElement: HTMLElement | null = null;

  function updatePosition() {
    if (!targetElement || !visible) return;

    const rect = targetElement.getBoundingClientRect();
    const gap = 8;

    // Default: Top Center
    let top = rect.top - tooltipHeight - gap;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Check top overflow
    if (top < 0) {
      // Flip to bottom
      top = rect.bottom + gap;
    }

    // Check left/right overflow
    if (left < 0) left = gap;
    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - gap;
    }

    x = left;
    y = top;
  }

  function show(e: MouseEvent) {
    const target = (e.target as HTMLElement).closest("[data-tooltip]");
    if (target) {
      text = target.getAttribute("data-tooltip") || "";
      targetElement = target as HTMLElement;
      visible = true;
      // Wait for DOM update to get dimensions
      setTimeout(() => {
        const el = document.getElementById("global-tooltip");
        if (el) {
          tooltipWidth = el.offsetWidth;
          tooltipHeight = el.offsetHeight;
          updatePosition();
        }
      }, 0);
    }
  }

  function hide() {
    visible = false;
    targetElement = null;
  }

  function onMouseOut(e: MouseEvent) {
    // Hide once the pointer leaves the tooltip's target (and not into a child).
    const target = (e.target as HTMLElement).closest("[data-tooltip]");
    if (target && !target.contains(e.relatedTarget as Node)) hide();
  }

  function onMouseMove() {
    // Safety net: if the element that owns the tooltip is gone (its menu was
    // closed / re-rendered), drop the now-orphaned tooltip so it can't stick.
    if (visible && targetElement && !targetElement.isConnected) hide();
  }

  onMount(() => {
    window.addEventListener("mouseover", show);
    window.addEventListener("mouseout", onMouseOut);
    window.addEventListener("mousedown", hide); // any click dismisses the tooltip
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("scroll", updatePosition, true); // Capture scroll to update pos
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("mouseover", show);
      window.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("mousedown", hide);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  });
</script>

{#if visible}
  <div
    id="global-tooltip"
    class="glass"
    style="top: {y}px; left: {x}px;"
  >
    {text}
  </div>
{/if}

<style>
  #global-tooltip {
    position: fixed;
    color: white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    z-index: 9999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    transition: left 0.1s ease-out, opacity 0.3s;
  }
</style>
