<script lang="ts">
  import {
    IconX,
    IconMusic,
    IconStar,
    IconStarFilled,
    IconPlayerPlayFilled,
  } from "@tabler/icons-svelte";
  import {
    SEED,
    GENRES,
    GENRE_TAG,
    stations,
    current,
    favorites,
    loading,
    error,
    selectStation,
    toggleFavorite,
    loadStations,
  } from "../../stores/radio";
  import type { Genre } from "../../stores/radio";
  import { pickerOpen, closePicker } from "../../stores/picker";
  import { t } from "../../locales/store";

  type Tab = Genre | "★" | "More";
  let tab: Tab = "Lo-Fi";
  let moreGenre: Genre = "Lo-Fi";

  // Reactive favorite-id set so the ★ toggles update live.
  $: favIds = new Set($favorites.map((f) => f.id));

  $: rows =
    tab === "★" ? $favorites : tab === "More" ? $stations : SEED[tab as Genre];

  function pickTab(next: Tab) {
    tab = next;
    if (next === "More") void loadStations(GENRE_TAG[moreGenre], 128);
  }
  function pickMoreGenre(g: Genre) {
    moreGenre = g;
    void loadStations(GENRE_TAG[g], 128);
  }
</script>

{#if $pickerOpen}
  <div class="picker glass">
    <div class="picker-head">
      <h3>{$t.picker.title}</h3>
      <button class="close" on:click={closePicker} aria-label="Close">
        <IconX size={18} />
      </button>
    </div>

    <div class="tabs">
      {#each GENRES as g}
        <button class:active={tab === g} on:click={() => pickTab(g)}>{g}</button>
      {/each}
      <button class:active={tab === "★"} on:click={() => pickTab("★")}>★ {$t.picker.favorites}</button>
      <button class:active={tab === "More"} on:click={() => pickTab("More")}>{$t.picker.more}</button>
    </div>

    {#if tab === "More"}
      <div class="subtabs">
        {#each GENRES as g}
          <button class:active={moreGenre === g} on:click={() => pickMoreGenre(g)}>{g}</button>
        {/each}
      </div>
    {/if}

    <div class="list">
      {#if tab === "More" && $loading}
        <p class="hint">{$t.picker.loading}</p>
      {:else if tab === "More" && $error}
        <button class="hint retry" on:click={() => loadStations(GENRE_TAG[moreGenre], 128)}>⚠ {$t.picker.retry}</button>
      {:else if tab === "★" && rows.length === 0}
        <p class="hint">{$t.picker.empty_favorites}</p>
      {:else}
        {#each rows as s (s.id)}
          <div class="row" class:playing={$current?.id === s.id}>
            <button class="row-main" on:click={() => selectStation(s)}>
              {#if s.favicon && s.favicon.startsWith("https")}
                <img class="fav-img" src={s.favicon} alt="" />
              {:else}
                <span class="fav-img icon"><IconMusic size={16} /></span>
              {/if}
              <span class="row-name">{s.name}</span>
              {#if $current?.id === s.id}<IconPlayerPlayFilled size={12} />{/if}
              {#if s.bitrate > 0}<span class="badge">{s.bitrate}k</span>{/if}
            </button>
            <button class="star" on:click|stopPropagation={() => toggleFavorite(s)} aria-label="Favorite">
              {#if favIds.has(s.id)}<IconStarFilled size={16} />{:else}<IconStar size={16} />{/if}
            </button>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .picker {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    max-height: 62vh;
    display: flex;
    flex-direction: column;
    color: white;
    border-radius: 20px 20px 0 0;
    padding: 14px 16px 18px;
    box-sizing: border-box;
    animation: sheet-up 0.25s ease;
  }
  @keyframes sheet-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  .picker-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .picker-head h3 { margin: 0; font-size: 1.1em; }
  .close { color: white; background: transparent; border: none; cursor: pointer; }
  .tabs, .subtabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .tabs button, .subtabs button {
    padding: 5px 12px;
    border-radius: 20px;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    font-size: 0.85em;
  }
  .tabs button.active, .subtabs button.active {
    background: white;
    color: black;
    font-weight: bold;
  }
  .subtabs button { font-size: 0.78em; padding: 3px 10px; }
  .list { overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; align-items: center; gap: 6px; border-radius: 10px; }
  .row.playing { background: rgba(255, 255, 255, 0.14); }
  .row-main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    text-align: left;
    min-width: 0;
    border-radius: 10px;
  }
  .row-main:hover { background: rgba(255, 255, 255, 0.08); }
  .fav-img {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    object-fit: cover;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
  }
  .row-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9em;
  }
  .badge {
    font-size: 0.7em;
    opacity: 0.75;
    background: rgba(255, 255, 255, 0.12);
    padding: 2px 6px;
    border-radius: 8px;
    flex-shrink: 0;
  }
  .star { color: white; background: transparent; border: none; cursor: pointer; padding: 6px; flex-shrink: 0; }
  .hint { opacity: 0.7; font-size: 0.85em; text-align: center; padding: 16px; }
  button.hint.retry { background: transparent; border: none; color: white; cursor: pointer; }
</style>
