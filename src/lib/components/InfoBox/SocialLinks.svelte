<script lang="ts">
  import {
    IconBrandGithub,
    IconBrandTelegram,
    // IconBrandInstagram,
    // IconBrandPatreon,
    // IconBrandTwitter,
    // IconLink,
  } from "@tabler/icons-svelte";
  import { open } from "@tauri-apps/plugin-shell";

  async function openExternal(event: MouseEvent, url: string) {
    event.preventDefault();
    await open(url);
  }
</script>

<div class="social-links">
  <a
    href="https://github.com/Victory-SergD/SergD_LoFiTyan"
    target="_blank"
    on:click={(e) => openExternal(e, "https://github.com/Victory-SergD/SergD_LoFiTyan")}
  >
    <IconBrandGithub size={25} />
  </a>
  <a
    href="https://t.me/sergei_dyshkant"
    target="_blank"
    data-tooltip="Telegram: @sergei_dyshkant"
    on:click={(e) => openExternal(e, "https://t.me/sergei_dyshkant")}
  >
    <IconBrandTelegram size={25} />
  </a>
</div>

<style>
  .social-links {
    display: flex;
    align-items: center;
    padding: 0 10px;
    margin-top: 5px;
  }
  .social-links a {
    margin-right: 20px;
    color: white;
  }
  .social-links a:hover {
    opacity: 80%;
  }
</style>
