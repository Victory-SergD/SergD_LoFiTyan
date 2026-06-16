<script lang="ts">
  import {
    IconArrowLeft,
    IconArrowRight,
    IconPhoto,
    IconTrash,
    IconMovie,
  } from "@tabler/icons-svelte";
  import { onMount, onDestroy } from "svelte";
  import { open } from "@tauri-apps/plugin-dialog";
  import { convertFileSrc } from "@tauri-apps/api/core";
  import localDB from "../../../localDB";
  import { t } from "../../../locales/store";
  import { isTypingTarget } from "../../../utils/dom";
  import {
    bgMedia,
    setBgMedia,
    setFocal,
    setScale,
    getTransform,
    hasTransform,
    saveTransform,
    MIN_SCALE,
    MAX_SCALE,
  } from "../../../stores/background";

  const MAX_DIMENSION = 1920;
  const WEBP_QUALITY  = 0.85;
  const MAX_FILE_MB   = 20;

  // get id from localstorage
  let id: any = localStorage.getItem("bg-id") || 1;
  let bgType = localStorage.getItem("bg-type") || "default";
  let customBgId = localStorage.getItem("custom-bg-id");

  let customBackgrounds = [];
  let allBackgrounds = [];
  let isUploading = false;
  let isTransitioning = false;

  // unified preview state (works for both image and video)
  let mediaEl: HTMLVideoElement | HTMLImageElement | undefined;
  let mediaW = 16;
  let mediaH = 9;
  let metaReady = false;

  // reactive current background id for transform persistence
  $: curId = bgType === "custom" && customBgId ? customBgId : `default_${id}`;

  onMount(async () => {
    await loadCustomBackgrounds();
    buildAllBackgrounds();
    applyCurrentBackground();
    window.addEventListener("customBackgroundSelected", onCustomBgSelected as EventListener);
    window.addEventListener("backgroundsUpdated", onBackgroundsUpdated);
    window.addEventListener("keydown", onBgKeydown);
  });

  onDestroy(() => {
    window.removeEventListener("customBackgroundSelected", onCustomBgSelected as EventListener);
    window.removeEventListener("backgroundsUpdated", onBackgroundsUpdated);
    window.removeEventListener("keydown", onBgKeydown);
  });

  /**
   * Resize + compress an image File to a WebP DataURL.
   * - Caps the longest side at MAX_DIMENSION
   * - Encodes as WebP at WEBP_QUALITY
   * Typical savings: 60–80 % vs. a raw 4 K JPEG.
   */
  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round((height / width) * MAX_DIMENSION);
            width  = MAX_DIMENSION;
          } else {
            width  = Math.round((width / height) * MAX_DIMENSION);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width  = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas context unavailable")); return; }

        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/webp", WEBP_QUALITY));
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image"));
      };

      img.src = objectUrl;
    });
  }

  async function loadCustomBackgrounds() {
    const saved = await localDB.getItem("custom-backgrounds");
    if (saved) {
      customBackgrounds = JSON.parse(saved);
    }
  }

  function buildAllBackgrounds() {
    allBackgrounds = [];

    for (let i = 1; i <= 10; i++) {
      allBackgrounds.push({
        id: `default_${i}`,
        type: "default",
        name: `Background ${i}`,
        url: `assets/background/bg${i}.webp`,
      });
    }

    customBackgrounds.forEach((bg) => {
      if (bg.kind === "video") {
        allBackgrounds.push({
          id: bg.id,
          type: "custom",
          kind: "video",
          name: bg.name,
          path: bg.path,
          focalX: bg.focalX,
          focalY: bg.focalY,
        });
      } else {
        allBackgrounds.push({
          id: bg.id,
          type: "custom",
          name: bg.name,
          url: bg.dataUrl,
        });
      }
    });
  }

  async function saveCustomBackgrounds() {
    try {
      await localDB.setItem("custom-backgrounds", JSON.stringify(customBackgrounds));
    } catch (e) {
      console.error("Failed to save backgrounds:", e);
    }
  }

  function selectCustomBackground(bg: any) {
    applyBackground({
      id: bg.id,
      type: "custom",
      name: bg.name,
      url: bg.dataUrl,
    });
  }

  function deleteCustomBackground(bg: any) {
    if (!bg) return;
    customBackgrounds = customBackgrounds.filter((b) => b.id !== bg.id);
    saveCustomBackgrounds();
    buildAllBackgrounds();

    window.dispatchEvent(new CustomEvent("backgroundsUpdated"));

    if (bgType === "custom" && customBgId === bg.id) {
      if (allBackgrounds.length > 0) {
        const first = allBackgrounds[0];
        if (first.kind === "video") {
          const originalItem = customBackgrounds.find((b) => b.id === first.id);
          if (originalItem) applyVideoItem(originalItem);
          else applyBackground(allBackgrounds[0]);
        } else {
          applyBackground(allBackgrounds[0]);
        }
      } else {
        localStorage.setItem("bg-type", "default");
        localStorage.removeItem("custom-bg-id");
        bgType = "default";
        customBgId = null;
        const tr = getTransform(`default_${id}`);
        setBgMedia("image", `assets/background/bg${id}.webp`, tr.focalX, tr.focalY, tr.scale);
      }
    }
  }

  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    isUploading = true;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        console.warn(`Skipping ${file.name}: exceeds ${MAX_FILE_MB} MB`);
        continue;
      }

      try {
        const dataUrl = await compressImage(file);

        const customBg = {
          id:      `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name:    file.name,
          dataUrl,
          type:    "image/webp",
        };

        customBackgrounds.push(customBg);
        saveCustomBackgrounds();
        buildAllBackgrounds();

        window.dispatchEvent(new CustomEvent("backgroundsUpdated"));
        selectCustomBackground(customBg);
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
      }
    }

      isUploading = false;
      target.value = "";
  }

  async function addVideo() {
    let selected: string | string[] | null;
    try {
      selected = await open({
        multiple: false,
        filters: [{ name: "Video", extensions: ["mp4", "webm", "mov", "m4v"] }],
      });
    } catch {
      return;
    }
    if (typeof selected !== "string") return;
    const name = selected.split(/[/\\]/).pop() ?? "video";
    const item = {
      id: `video_${Date.now()}`,
      name,
      kind: "video" as const,
      path: selected,
      focalX: 50,
      focalY: 50,
    };
    customBackgrounds.push(item);
    saveCustomBackgrounds();
    buildAllBackgrounds();
    window.dispatchEvent(new CustomEvent("backgroundsUpdated"));
    applyVideoItem(item);
  }

  function applyVideoItem(item: any) {
    metaReady = false;
    if (!hasTransform(item.id)) {
      saveTransform(item.id, { focalX: item.focalX ?? 50, focalY: item.focalY ?? 50, scale: 1 });
    }
    const tr = getTransform(item.id);
    setBgMedia("video", convertFileSrc(item.path), tr.focalX, tr.focalY, tr.scale);
    id = item.id;
    bgType = "custom";
    customBgId = item.id;
    localStorage.setItem("bg-type", "custom");
    localStorage.setItem("custom-bg-id", item.id);
  }

  function applyCurrentBackground() {
    if (bgType === "custom" && customBgId) {
      const customBg = customBackgrounds.find((bg) => bg.id === customBgId);
      if (customBg) {
        if (customBg.kind === "video") {
          applyVideoItem(customBg);
        } else {
          const tr = getTransform(customBg.id);
          setBgMedia("image", customBg.dataUrl, tr.focalX, tr.focalY, tr.scale);
        }
        return;
      } else {
        bgType = "default";
        localStorage.setItem("bg-type", "default");
        localStorage.removeItem("custom-bg-id");
      }
    }
    const tr = getTransform(`default_${id}`);
    setBgMedia("image", `assets/background/bg${id}.webp`, tr.focalX, tr.focalY, tr.scale);
  }

  function nextBg() {
    buildAllBackgrounds();
    const currentIndex = getCurrentIndex();
    const idx = (currentIndex + 1) % allBackgrounds.length;
    const target = allBackgrounds[idx];
    if (target.kind === "video") {
      const originalItem = customBackgrounds.find((b) => b.id === target.id);
      if (originalItem) applyVideoItem(originalItem);
    } else {
      applyBackground(target);
    }
  }

  function prevBg() {
    buildAllBackgrounds();
    const currentIndex = getCurrentIndex();
    const prevIndex = currentIndex === 0 ? allBackgrounds.length - 1 : currentIndex - 1;
    const target = allBackgrounds[prevIndex];
    if (target.kind === "video") {
      const originalItem = customBackgrounds.find((b) => b.id === target.id);
      if (originalItem) applyVideoItem(originalItem);
    } else {
      applyBackground(target);
    }
  }

  function getCurrentIndex(): number {
    if (bgType === "custom" && customBgId)
      return allBackgrounds.findIndex((bg) => bg.id === customBgId);
    return allBackgrounds.findIndex((bg) => bg.id === `default_${id}`);
  }

  function applyBackground(background: any) {
    metaReady = false;
    isTransitioning = true;

    const img = new Image();
    img.onload = () => {
      isTransitioning = false;
    };
    img.onerror = () => { isTransitioning = false; };
    img.src = background.url;

    if (background.type === "default") {
      const defaultId = background.id.replace("default_", "");
      id = parseInt(defaultId);
      bgType = "default";
      localStorage.setItem("bg-id", id.toString());
      localStorage.setItem("bg-type", "default");
      localStorage.removeItem("custom-bg-id");
      const tr = getTransform(`default_${id}`);
      setBgMedia("image", background.url, tr.focalX, tr.focalY, tr.scale);
    } else {
      customBgId = background.id;
      bgType = "custom";
      localStorage.setItem("bg-type", "custom");
      localStorage.setItem("custom-bg-id", customBgId);
      const tr = getTransform(background.id);
      setBgMedia("image", background.url, tr.focalX, tr.focalY, tr.scale);
    }
  }

  const onCustomBgSelected = (event: CustomEvent) => {
    bgType = "custom";
    customBgId = event.detail.id;
    localStorage.setItem("bg-type", "custom");
    localStorage.setItem("custom-bg-id", customBgId);
  };

  const onBackgroundsUpdated = async () => {
    await loadCustomBackgrounds();
    buildAllBackgrounds();
  };

  const onBgKeydown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest?.("#settings-box")) return;
    if (isTypingTarget(e)) return;
    if (e.key === "ArrowRight") {
      nextBg();
    } else if (e.key === "ArrowLeft") {
      prevBg();
    }
  };

  function onMediaMeta() {
    if (!mediaEl) return;
    mediaW = (mediaEl as HTMLVideoElement).videoWidth || (mediaEl as HTMLImageElement).naturalWidth || 16;
    mediaH = (mediaEl as HTMLVideoElement).videoHeight || (mediaEl as HTMLImageElement).naturalHeight || 9;
    metaReady = true;
  }

  function onFocalClick(e: MouseEvent) {
    if (!metaReady) return;
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const fx = Math.max(0, Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100)));
    const fy = Math.max(0, Math.min(100, Math.round(((e.clientY - r.top) / r.height) * 100)));
    setFocal(fx, fy);
    saveTransform(curId, { focalX: fx, focalY: fy, scale: $bgMedia?.scale ?? 1 });
  }

  function onZoom(e: Event) {
    const s = parseFloat((e.currentTarget as HTMLInputElement).value);
    setScale(s);
    saveTransform(curId, { focalX: $bgMedia?.focalX ?? 50, focalY: $bgMedia?.focalY ?? 50, scale: s });
  }
</script>

<div>
  <div class="header">
    <h4>{$t.settings.background.title}</h4>
    <label
      data-tooltip={$t.settings.background.add_custom}
      for="bg-upload"
      class="upload-btn"
      class:uploading={isUploading}
    >
      <IconPhoto size={16} />
    </label>
    <button
      class="upload-btn"
      data-tooltip={$t.settings.background.add_video}
      on:click={addVideo}
      type="button"
    >
      <IconMovie size={16} />
    </button>
    <input
      id="bg-upload"
      type="file"
      accept="image/*"
      multiple
      on:change={handleFileUpload}
      style="display: none;"
    />
  </div>

  <div class="container">
    <button on:click={prevBg}>
      <IconArrowLeft size={20} />
    </button>
    {#if allBackgrounds.length > 0}
      {@const currentBg = allBackgrounds.find(
        (bg) =>
          (bgType === "custom" && bg.id === customBgId) ||
          (bgType === "default" && bg.id === `default_${id}`),
      )}
      {#if currentBg}
        <div class="preview-container" class:transitioning={isTransitioning}>
          <button
            type="button"
            class="focal-preview"
            data-tooltip={$t.settings.background.focal_hint}
            style="aspect-ratio: {mediaW} / {mediaH}"
            on:click={onFocalClick}
          >
            {#if $bgMedia?.kind === "video"}
              <video
                bind:this={mediaEl}
                src={$bgMedia.src}
                on:loadedmetadata={onMediaMeta}
                preload="metadata"
                muted
                playsinline
              ></video>
            {:else if $bgMedia}
              <img bind:this={mediaEl} src={$bgMedia.src} alt="" on:load={onMediaMeta} />
            {/if}
            <span
              class="focal-marker"
              style="left:{$bgMedia?.focalX ?? 50}%; top:{$bgMedia?.focalY ?? 50}%"
            ></span>
          </button>
          {#if bgType === "custom" && customBgId}
            <button
              class="delete-current-btn"
              on:click={() =>
                deleteCustomBackground(
                  customBackgrounds.find((bg) => bg.id === customBgId),
                )}
              data-tooltip={$t.settings.background.delete_tooltip}
            >
              <IconTrash size={16} />
            </button>
          {/if}
        </div>
      {:else}
        <div class="preview-container">
          <button
            type="button"
            class="focal-preview"
            data-tooltip={$t.settings.background.focal_hint}
            style="aspect-ratio: {mediaW} / {mediaH}"
            on:click={onFocalClick}
          >
            {#if $bgMedia}
              <img bind:this={mediaEl} src={$bgMedia.src} alt="" on:load={onMediaMeta} />
            {/if}
            <span
              class="focal-marker"
              style="left:{$bgMedia?.focalX ?? 50}%; top:{$bgMedia?.focalY ?? 50}%"
            ></span>
          </button>
        </div>
      {/if}
    {:else}
      <div class="preview-container">
        <button
          type="button"
          class="focal-preview"
          data-tooltip={$t.settings.background.focal_hint}
          style="aspect-ratio: {mediaW} / {mediaH}"
          on:click={onFocalClick}
        >
          {#if $bgMedia}
            <img bind:this={mediaEl} src={$bgMedia.src} alt="" on:load={onMediaMeta} />
          {/if}
          <span
            class="focal-marker"
            style="left:{$bgMedia?.focalX ?? 50}%; top:{$bgMedia?.focalY ?? 50}%"
          ></span>
        </button>
      </div>
    {/if}
    <button on:click={nextBg}>
      <IconArrowRight size={20} />
    </button>
  </div>

  <div class="zoom-row" data-tooltip={$t.settings.background.zoom_hint}>
    <span class="zoom-ico">−</span>
    <input
      class="zoom-slider"
      type="range"
      min={MIN_SCALE}
      max={MAX_SCALE}
      step="0.05"
      value={$bgMedia?.scale ?? 1}
      on:input={onZoom}
      aria-label="Zoom background"
    />
    <span class="zoom-ico">+</span>
  </div>

  {#if isUploading}
    <div class="uploading-indicator">
      <div class="spinner"></div>
      <span>{$t.settings.background.processing}</span>
    </div>
  {/if}
</div>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .header h4 {
    margin: 0;
    color: white;
    font-size: 1.1em;
  }

  .upload-btn {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .upload-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .upload-btn.uploading {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 20px;
    justify-content: center;
  }

  .preview-container {
    position: relative;
    display: inline-block;
  }

  .focal-preview {
    position: relative;
    width: 220px;
    margin: 0 10px;
    padding: 0;
    border: none;
    border-radius: 7px;
    overflow: hidden;
    cursor: crosshair;
    background: #000;
    display: block;
  }

  .focal-preview video,
  .focal-preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .focal-marker {
    position: absolute;
    width: 18px;
    height: 18px;
    border: 2px solid #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.45);
    pointer-events: none;
  }

  .delete-current-btn {
    position: absolute;
    bottom: 18px;
    right: 18px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: rgba(255, 0, 0, 0.9);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition:
      opacity 0.2s ease,
      background-color 0.2s ease;
    backdrop-filter: blur(5px);
    z-index: 10;
  }

  .preview-container:hover .delete-current-btn {
    opacity: 1;
  }

  .delete-current-btn:hover {
    background-color: rgba(255, 0, 0, 1);
  }

  button:not(.upload-btn):not(.focal-preview):not(.delete-current-btn) {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: white;
    overflow: hidden;
  }
  button:not(.upload-btn):not(.focal-preview):not(.delete-current-btn):hover {
    backdrop-filter: blur(10px);
    background-color: rgba(0, 0, 0, 10%);
  }

  .zoom-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }

  .zoom-slider {
    flex: 1;
  }

  .zoom-ico {
    color: #fff;
    opacity: 0.7;
    width: 14px;
    text-align: center;
  }

  .uploading-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9em;
    margin-top: 10px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @media only screen and (max-width: 600px) {
    .focal-preview {
      width: 90px;
    }
  }
</style>
