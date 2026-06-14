<script lang="ts">
  import {
      IconLoader,
      IconPlayerPauseFilled,
      IconPlayerPlayFilled,
      IconRefresh,
  } from "@tabler/icons-svelte";
  import { onDestroy, onMount } from "svelte";
// @ts-ignore
  import * as Tone from "tone";
  import ChordProgression from "../lib/engine/Chords/ChordProgression";
  import intervalWeights from "../lib/engine/Chords/IntervalWeights";
  import Keys from "../lib/engine/Chords/Keys";
  import { fiveToFive } from "../lib/engine/Chords/MajorScale";
  import Hat from "../lib/engine/Drums/Hat";
  import Kick from "../lib/engine/Drums/Kick";
  import Noise from "../lib/engine/Drums/Noise";
  import Snare from "../lib/engine/Drums/Snare";
  import Piano from "../lib/engine/Piano/Piano";
  import { get } from "svelte/store";
  import { volumes } from "../lib/stores/volume";
  import { autoDjMode } from "../lib/stores/autodj";
  import { atmosphere, setLayer } from "../lib/stores/atmosphere";
  import { t } from "../lib/locales/store";

  // Convert linear volume (0 to 1) to dB
  const linearToDb = (value: number) =>
    value === 0 ? -Infinity : 20 * Math.log10(value);

  // Setup audio chain
  const cmp = new Tone.Compressor({
    threshold: -6,
    ratio: 3,
    attack: 0.5,
    release: 0.1,
  });
  const lpf = new Tone.Filter(2000, "lowpass");
  const vol = new Tone.Volume(linearToDb(get(volumes).master));
  Tone.Master.chain(cmp, lpf, vol);
  Tone.Transport.bpm.value = 156;
  Tone.Transport.swing = 1;

  // State variables
  let key = "C";
  let progression = [];
  let scale = [];
  let progress = 0;
  let scalePos = 0;

  let pianoLoaded = false;
  let kickLoaded = false;
  let snareLoaded = false;
  let hatLoaded = false;

  let contextStarted = false;
  let genChordsOnce = false;

  let kickOff = false;
  let snareOff = false;
  let hatOff = false;
  let melodyDensity = 0.33;
  let melodyOff = false;

  let isPlaying = false;
  let isStarting = false;

  // Initialize instruments
  const pn = new Piano(() => (pianoLoaded = true)).sampler;
  const kick = new Kick(() => (kickLoaded = true)).sampler;
  const snare = new Snare(() => (snareLoaded = true)).sampler;
  const hat = new Hat(() => (hatLoaded = true)).sampler;
  const noise = Noise;

  // Sequences
  let chords, melody, kickLoop, snareLoop, hatLoop;

  onMount(() => {
    // Setup sequences
    chords = new Tone.Sequence(
      (time, note) => {
        playChord();
      },
      [""],
      "1n",
    );

    melody = new Tone.Sequence(
      (time, note) => {
        playMelody();
      },
      [""],
      "8n",
    );

    kickLoop = new Tone.Sequence(
      (time, note) => {
        if (!kickOff) {
          if (note === "C4" && Math.random() < 0.9) {
            // @ts-ignore
            kick.triggerAttack(note);
          } else if (note === "." && Math.random() < 0.1) {
            // @ts-ignore
            kick.triggerAttack("C4");
          }
        }
      },
      ["C4", "", "", "", "", "", "", "C4", "C4", "", ".", "", "", "", "", ""],
      "8n",
    );

    snareLoop = new Tone.Sequence(
      (time, note) => {
        if (!snareOff) {
          if (note !== "" && Math.random() < 0.8) {
            // @ts-ignore
            snare.triggerAttack(note);
          }
        }
      },
      ["", "C4"],
      "2n",
    );

    hatLoop = new Tone.Sequence(
      (time, note) => {
        if (!hatOff) {
          // @ts-ignore
          if (note !== "" && Math.random() < 0.8) {
            // @ts-ignore
            hat.triggerAttack(note);
          }
        }
      },
      ["C4", "C4", "C4", "C4", "C4", "C4", "C4", "C4"],
      "4n",
    );

    chords.humanize = true;
    melody.humanize = true;
    kickLoop.humanize = true;
    snareLoop.humanize = true;
    hatLoop.humanize = true;

    // Listen for spacebar press
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleButtonAction();
      }
    };

    const handleCustomToggle = () => {
      handleButtonAction();
    };

    // Global stop-all ('k'): stop the generative music ONLY if playing.
    // Idempotent — never calls toggle()/handleButtonAction(), so it can't
    // accidentally START audio. (audio-7)
    const handleStopAll = () => {
      // Reconcile Auto-DJ ownership: after a stop-all everything is silenced,
      // so the DJ no longer owns any layer/effect. Clearing prevents it from
      // re-enabling a just-silenced sound on the next tick. (audio-9 / audio-10)
      djLayerId = null;
      djEffect = null;
      if (Tone.Transport.state === "started") {
        noise.stop();
        Tone.Transport.stop();
        isPlaying = false;
        window.dispatchEvent(
          new CustomEvent("lofi-play-state-changed", {
            detail: { isPlaying: false },
          })
        );
      }
    };

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("lofi-toggle-play", handleCustomToggle);
    window.addEventListener("lofi-stop-all", handleStopAll);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("lofi-toggle-play", handleCustomToggle);
      window.removeEventListener("lofi-stop-all", handleStopAll);
    };
  });

  // Live master volume from the store — no polling (audio-5).
  const unsubVolume = volumes.subscribe((v) => {
    vol.volume.value = linearToDb(v.master);
  });

  onDestroy(() => {
    unsubVolume();
    // Unconditional teardown so nothing outlives the component on HMR/destroy. (audio-13)
    try {
      noise.stop();
      Tone.Transport.stop();
      chords?.stop();
      melody?.stop();
      kickLoop?.stop();
      snareLoop?.stop();
      hatLoop?.stop();
      chords?.dispose();
      melody?.dispose();
      kickLoop?.dispose();
      snareLoop?.dispose();
      hatLoop?.dispose();
    } catch (e) {
      // no-op stops on an already-stopped transport/sequence may throw — ignore.
    }
  });

  let barCount = 0;
  let sectionBarLength = 32; // change section every 32 bars
  let isTransitioning = false;

  // Auto-DJ single-owner state: the DJ tracks ONLY what IT turned on so it can
  // cross-fade its own pick (turn its previous one off before a new one on),
  // cap its own concurrent count at 1, and NEVER touch user-enabled sounds.
  // (audio-9 / audio-10)
  let djLayerId: string | null = null; // the one atmosphere layer the DJ owns
  let djEffect: string | null = null; // the one weather effect the DJ owns

  function nextChord() {
    const nextProgress = progress === progression.length - 1 ? 0 : progress + 1;
    const nextKickOff = Math.random() < 0.15;
    const nextSnareOff = Math.random() < 0.2;
    const nextHatOff = Math.random() < 0.25;
    const nextMelodyDensity = Math.random() * 0.3 + 0.2;
    const nextMelodyOff = Math.random() < 0.25;

    if (progress === 4) {
      progress = nextProgress;
      kickOff = nextKickOff;
      snareOff = nextSnareOff;
      hatOff = nextHatOff;
    } else if (progress === 0) {
      progress = nextProgress;
      kickOff = nextKickOff;
      snareOff = nextSnareOff;
      hatOff = nextHatOff;
      melodyDensity = nextMelodyDensity;
      melodyOff = nextMelodyOff;
    } else {
      progress = nextProgress;
    }
    barCount++;
    if(barCount >= sectionBarLength) {
      barCount = 0;
      autoDJTransition();
      // New next transition length
      const barLengthOptions = [16, 20, 24, 28, 32, 48];
      sectionBarLength = barLengthOptions[Math.floor(Math.random() * barLengthOptions.length)];
    }
  }

  function autoDJTransition() {
    if(isTransitioning) return; // Prevent overlaps
    if($autoDjMode === "MANUAL") return;

    isTransitioning = true;

    // Change keys/chords
    generateProgression()
    
    // Original Instrument Logic (Applied in ALL active modes: MUSIC, ATMOSPHERE, WORLD)
    // This was the "current main lofi track generation"
    melodyDensity = 0.2 + Math.random() * 0.5;
    kickOff = Math.random() < 0.13;
    snareOff = Math.random() < 0.17;
    hatOff = Math.random() < 0.22;
    melodyOff = Math.random() < 0.25;

    // Smart Effects: single-owner cross-fade of ONE DJ-owned weather effect.
    // Applied in ATMOSPHERE and WORLD. The DJ uses EXPLICIT on/off (lofi-set-*),
    // so it only ever manages its own pick and never silences a user-enabled
    // effect. Cap = 1 DJ effect at a time. (audio-10)
    if ($autoDjMode === "ATMOSPHERE" || $autoDjMode === "WORLD") {
      // 30% chance to rotate the DJ's effect
      if (Math.random() < 0.3) {
        // Turn the DJ's previous pick OFF first (cross-fade), if it owns one.
        if (djEffect) {
          window.dispatchEvent(
            new CustomEvent(`lofi-set-${djEffect}`, { detail: { on: false } })
          );
        }
        const effects = ["rain", "thunder", "jungle", "campfire"];
        const newEffect = effects[Math.floor(Math.random() * effects.length)];
        window.dispatchEvent(
          new CustomEvent(`lofi-set-${newEffect}`, { detail: { on: true } })
        );
        djEffect = newEffect;
      }
    }

    // Smart layers: single-owner cross-fade of ONE DJ-owned atmosphere layer.
    // WORLD only. Reads fresh store state each tick; uses the idempotent
    // setLayer (no blind toggle). Cap = 1 DJ layer; never touches a layer the
    // user enabled. (audio-9)
    if ($autoDjMode === "WORLD") {
      if (Math.random() < 0.2) {
        const layers = get(atmosphere);
        // Turn the DJ's previous pick OFF first (cross-fade), if it owns one.
        if (djLayerId) {
          setLayer(djLayerId, false);
        }
        // Pick a NEW layer the user hasn't manually turned on (not currently
        // playing) and that isn't the DJ's previous pick.
        const candidates = layers.filter(
          (l) => !l.isPlaying && l.id !== djLayerId
        );
        if (candidates.length > 0) {
          const newId =
            candidates[Math.floor(Math.random() * candidates.length)].id;
          setLayer(newId, true);
          djLayerId = newId;
        } else {
          // Nothing free to enable — DJ owns nothing this tick.
          djLayerId = null;
        }
      }
    }

    // Crossfade FX (Always apply for smoother transitions if not OFF)
    lpf.frequency.linearRampTo(300, 2) // 2s Muffle
    setTimeout(() => {
      lpf.frequency.linearRampTo(1200, 2) // Open back up
      setTimeout(() => {
        isTransitioning = false;
      }, 2000);
    }, 2000);
  }

  function playChord() {
    const chord = progression[progress];
    const root = Tone.Frequency(key + "3").transpose(chord.semitoneDist);
    const size = 4;
    const voicing = chord.generateVoicing(size);
    const notes = Tone.Frequency(root)
      .harmonize(voicing)
      .map((f) => Tone.Frequency(f).toNote());
    // @ts-ignore
    pn.triggerAttackRelease(notes, "1n");
    nextChord();
  }

  function playMelody() {
    if (melodyOff || !(Math.random() < melodyDensity)) {
      return;
    }

    const descendRange = Math.min(scalePos, 7) + 1;
    const ascendRange = Math.min(scale.length - scalePos, 7);

    let descend = descendRange > 1;
    let ascend = ascendRange > 1;

    if (descend && ascend) {
      if (Math.random() > 0.5) {
        ascend = !descend;
      } else {
        descend = !ascend;
      }
    }

    let weights = descend
      ? intervalWeights.slice(0, descendRange)
      : intervalWeights.slice(0, ascendRange);

    const sum = weights.reduce((prev, curr) => prev + curr, 0);
    weights = weights.map((w) => w / sum);
    for (let i = 1; i < weights.length; i++) {
      weights[i] += weights[i - 1];
    }

    const randomWeight = Math.random();
    let scaleDist = 0;
    let found = false;
    while (!found) {
      if (randomWeight <= weights[scaleDist]) {
        found = true;
      } else {
        scaleDist++;
      }
    }

    const scalePosChange = descend ? -scaleDist : scaleDist;
    const newScalePos = scalePos + scalePosChange;

    scalePos = newScalePos;
    // @ts-ignore
    pn.triggerAttackRelease(scale[newScalePos], "2n");
  }

  function generateProgression() {
    const _scale = fiveToFive;
    const newKey = Keys[Math.floor(Math.random() * Keys.length)];
    const newScale = Tone.Frequency(newKey + "5")
      .harmonize(_scale)
      .map((f) => Tone.Frequency(f).toNote());
    const newProgression = ChordProgression.generate(8);
    const newScalePos = Math.floor(Math.random() * _scale.length);

    key = newKey;
    progress = 0;
    progression = newProgression;
    scale = newScale;
    genChordsOnce = true;
    scalePos = newScalePos;
  }

  async function toggle() {
    progress = 0;
    if (Tone.Transport.state === "started") {
      noise.stop();
      Tone.Transport.stop();
      isPlaying = false;
    } else {
      await Tone.start();
      Tone.Transport.start();
      noise.start(0);
      chords.start(0);
      melody.start(0);
      kickLoop.start(0);
      snareLoop.start(0);
      hatLoop.start(0);
      isPlaying = true;
    }
    window.dispatchEvent(
      new CustomEvent("lofi-play-state-changed", { detail: { isPlaying } })
    );
  }

  async function startAudioContext() {
    await Tone.start();
    contextStarted = Tone.context.state === "running";
  }

  $: allSamplesLoaded = pianoLoaded && kickLoaded && snareLoaded && hatLoaded;
  $: activeProgressionIndex = (progress + 7) % 8;
  // Prepare the first progression once samples are loaded.
  // Do NOT call startAudioContext() here — Tone.start() (AudioContext resume)
  // must only run inside a real user gesture (handleButtonAction). (audio-11)
  $: if (allSamplesLoaded && !genChordsOnce) {
    generateProgression();
  }

  async function handleButtonAction() {
    // Single race guard for ALL entry points (click, spacebar, lofi-toggle-play). (audio-8)
    if (isStarting) return;
    if (!allSamplesLoaded) {
      return;
    } else if (!contextStarted) {
      isStarting = true;
      try {
        await startAudioContext();
      } finally {
        isStarting = false;
      }
    } else if (!genChordsOnce) {
      return;
    } else {
      isStarting = true;
      try {
        await toggle();
      } finally {
        isStarting = false;
      }
    }
  }

  // Explicit "new music": change key/progression. The sequences keep running
  // and pick up the new chords on the next bar. We intentionally do NOT call
  // seq.start(0) — at an already-started Transport, time 0 is in the past so
  // those calls are no-ops and could risk double-scheduling. (audio-14)
  function regenerate() {
    generateProgression();
  }
</script>

<div>
  <div class="controls">
    <button
      class="play-button"
      on:click={handleButtonAction}
      disabled={!allSamplesLoaded}
    >
      {#if !allSamplesLoaded}
        <IconLoader size={30} class="spinning" />
      {:else if !contextStarted}
        <span class="context-text">Initialize Audio</span>
      {:else if !genChordsOnce}
        <IconPlayerPlayFilled size={30} class="disabled" />
      {:else if isPlaying}
        <IconPlayerPauseFilled size={30} />
      {:else}
        <IconPlayerPlayFilled size={30} />
      {/if}
    </button>
    <button class="generateBtn glass" on:click={regenerate} title={$t.player.regenerate}>
      <IconRefresh size={16} />
      <span class="generate-label">{$t.player.regenerate}</span>
    </button>
  </div>

  {#if allSamplesLoaded && contextStarted}
    {#if genChordsOnce}
      <ol class="progressionList">
        <li class="key" id="glass">{key}</li>
        {#each progression as chord, idx}
          <li id="glass" class={idx === activeProgressionIndex ? "live" : ""}>
            {chord.degree}
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
</div>

<style>
  .controls {
    position: fixed;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column-reverse;
    justify-content: center;
    align-items: center;
    gap: 5px;
    z-index: 30;
  }

  .play-button {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background-color: white;
    color: black;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .play-button:hover {
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
  }

  .generateBtn {
    color: white;
    border: none;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    width: auto;
    padding: 0 12px;
    border-radius: 20px;
    margin-top: 10px;
    outline: none;
  }
  .generate-label {
    font-size: 12px;
    color: white;
  }

  .progressionList {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    list-style: none;
    padding: 0;
    justify-content: center;
    flex-wrap: wrap;
    gap: 20px;
    z-index: 1;
  }

  .progressionList li {
    padding: 5px 10px;
    border-radius: 4px;
    color: white;
    border: 2px solid transparent;
  }

  .progressionList li.live {
    border-color:#ffffff66;
  }

  @media only screen and (max-width: 600px) {
    .progressionList {
      bottom: 0;
      left: 0;
      width: 100vw;
      transform: scale(0.8);
    }
  }

  /* Portrait (variant B): the character art is the hero in the middle and the
     play-controls dock at the BOTTOM of the screen. The chord progression list
     sits inside that same bottom dock (just under the play button), not
     off-screen. The top content (tracklist/effects) stays at the top and no
     longer collides with this dock. */
  @media (orientation: portrait) {
    .controls {
      position: fixed;
      left: 50%;
      transform: translateX(-50%);
      bottom: 24px;
      margin: 0;
      z-index: 30;
    }

    /* Chords sit just ABOVE the bottom play dock (the .controls block is
       ~70px play + ~40px New-music button + gaps ≈ 135px tall), kept as a
       single compact NON-wrapping row so the whole play cluster stays tight
       in the bottom dock instead of sprawling up over the character. */
    .progressionList {
      position: fixed;
      left: 50%;
      transform: translateX(-50%) scale(0.72);
      transform-origin: bottom center;
      bottom: 150px;
      top: auto;
      width: auto;
      max-width: 100vw;
      margin: 0;
      flex-wrap: nowrap;
      gap: 8px;
      z-index: 30;
    }
  }
</style>
