<script lang="ts">
  import { IconArrowLeft, IconArrowRight } from "@tabler/icons-svelte";
  import { t } from "../../locales/store";

  // Show the right modifier per OS: ⌘ on macOS, Ctrl on Windows/Linux.
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);
  const mod = isMac ? "⌘" : "Ctrl";
</script>

<div class="shortcuts">
  <h4>{$t.info.shortcuts.title}</h4>

  <h5 style="margin-left: 10px;">{$t.info.shortcuts.general.title}</h5>
  <div class="shortcut">
    <div class="shortcut-key">Esc</div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.esc}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">J</div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.j}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">{mod} + I</div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.immersive}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key"><IconArrowRight size={15} /></div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.next_bg}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key"><IconArrowLeft size={15} /></div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.prev_bg}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">{mod} + R</div>
    <div class="shortcut-desc">{$t.info.shortcuts.general.restart}</div>
  </div>

  <h5 style="margin-left: 10px;">{$t.info.shortcuts.radio.title}</h5>
  <div class="shortcut">
    <div class="shortcut-key">Space</div>
    <div class="shortcut-desc">{$t.info.shortcuts.radio.play_pause}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">K</div>
    <div class="shortcut-desc">{$t.info.shortcuts.radio.stop_all}</div>
  </div>

  <h5 style="margin-left: 10px;">{$t.info.shortcuts.effects.title}</h5>
  <div class="shortcut">
    <div class="shortcut-key">A</div>
    <div class="shortcut-desc">{$t.info.shortcuts.effects.rain}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">S</div>
    <div class="shortcut-desc">{$t.info.shortcuts.effects.thunder}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">D</div>
    <div class="shortcut-desc">{$t.info.shortcuts.effects.nature}</div>
  </div>
  <div class="shortcut">
    <div class="shortcut-key">F</div>
    <div class="shortcut-desc">{$t.info.shortcuts.effects.campfire}</div>
  </div>
</div>

<style>
  .shortcuts {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 10px;
  }
  h4,
  h5 {
    margin: 0;
  }
  .shortcut {
    display: flex;
    gap: 1rem;
    font-size: small;
    margin-left: 20px;
  }
  .shortcut-key {
    min-width: 30px;
    background-color: #fff;
    color: #000;
    padding: 5px 10px;
    border-radius: 10px;
    text-align: center;
  }
  .shortcut-desc {
    color: #fff;
  }
</style>
