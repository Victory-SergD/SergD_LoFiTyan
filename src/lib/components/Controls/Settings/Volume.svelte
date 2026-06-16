<script lang="ts">
    import { t } from "../../../locales/store";
    import { volumes, setMaster, setEffectVolume } from "../../../stores/volume";

    // Sliders read from the volumes store and write via its setters; the store
    // owns persistence (key "lofityan.volumes") — no legacy "Volumes" writes here.
    $: rainVolume = $volumes.effects.rain ?? 1;
    $: thunderVolume = $volumes.effects.thunder ?? 1;
    $: jungleVolume = $volumes.effects.jungle ?? 1;
    $: campfireVolume = $volumes.effects.campfire ?? 1;
    $: mainTrackVolume = $volumes.master;

    function updateRainVolume(e: Event) {
        setEffectVolume("rain", parseFloat((e.target as HTMLInputElement).value));
    }
    function updateThunderVolume(e: Event) {
        setEffectVolume("thunder", parseFloat((e.target as HTMLInputElement).value));
    }
    function updateJungleVolume(e: Event) {
        setEffectVolume("jungle", parseFloat((e.target as HTMLInputElement).value));
    }
    function updateFireVolume(e: Event) {
        setEffectVolume("campfire", parseFloat((e.target as HTMLInputElement).value));
    }
    function updateMainTrackVolume(e: Event) {
        setMaster(parseFloat((e.target as HTMLInputElement).value));
    }
</script>

<div>
    <h4>{$t.settings.volume.title}</h4>
    <section id="rain-volume">
        <h5>{$t.settings.volume.rain}</h5>
        <p>{Math.round(rainVolume * 100)}</p>
        <input
            id="vol-rain"
            class="volume-slider"
            type="range"
            value={rainVolume}
            min="0.01"
            max="1"
            step="0.01"
            on:input={updateRainVolume}
        />
    </section>
    <section id="thunder-volume">
        <h5>{$t.settings.volume.thunder}</h5>
        <p>{Math.round(thunderVolume * 100)}</p>
        <input
            id="vol-thunder"
            class="volume-slider"
            type="range"
            value={thunderVolume}
            min="0.01"
            max="1"
            step="0.01"
            on:input={updateThunderVolume}
        />
    </section>
    <section id="jungle-volume">
        <h5>{$t.settings.volume.jungle}</h5>
        <p>{Math.round(jungleVolume * 100)}</p>
        <input
            id="vol-jungle"
            class="volume-slider"
            type="range"
            value={jungleVolume}
            min="0.01"
            max="1"
            step="0.01"
            on:input={updateJungleVolume}
        />
    </section>
    <section id="fire-volume">
        <h5>{$t.settings.volume.campfire}</h5>
        <p>{Math.round(campfireVolume * 100)}</p>
        <input
            id="vol-campfire"
            class="volume-slider"
            type="range"
            value={campfireVolume}
            min="0.01"
            max="1"
            step="0.01"
            on:input={updateFireVolume}
        />
    </section>
    <section id="main-track-volume">
        <h5>{$t.settings.volume.main_track}</h5>
        <p>{Math.round(mainTrackVolume * 100)}</p>
        <input
            id="vol-main"
            class="volume-slider"
            type="range"
            value={mainTrackVolume}
            min="0.01"
            max="1"
            step="0.01"
            on:input={updateMainTrackVolume}
        />
    </section>
</div>

<style>
    h5 {
        margin-left: 10px;
        margin-bottom: -35px;
    }
    p {
        text-align: right;
        font-size: 12px;
        margin-right: 7%;
    }
    .volume-slider {
        width: 90%;
        margin-left: 10px;
    }
</style>
