// Gapless looping via Web Audio. One shared AudioContext; each loop decodes its
// file once and loops an AudioBufferSourceNode (no native-<audio> loop gap).
let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  // Lazily create; some TS libs type webkitAudioContext separately.
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

export interface Loop {
  play(): Promise<void>;
  stop(): void;
  setVolume(v: number): void;
  isPlaying(): boolean;
}

export function createLoop(url: string): Loop {
  let buffer: AudioBuffer | null = null;
  let source: AudioBufferSourceNode | null = null;
  let gain: GainNode | null = null;
  let playing = false;
  let vol = 1;

  async function ensureBuffer(c: AudioContext): Promise<AudioBuffer> {
    if (buffer) return buffer;
    const res = await fetch(url);
    const data = await res.arrayBuffer();
    buffer = await c.decodeAudioData(data);
    return buffer;
  }

  return {
    async play() {
      if (playing) return;       // already playing/claimed -> ignore re-entry
      playing = true;            // claim intent NOW, before any await
      const c = getCtx();
      try {
        if (c.state === "suspended") await c.resume(); // needs a user gesture; the toggle click provides it
        const buf = await ensureBuffer(c);
        if (!playing) return;    // a stop() during load cancelled us
        if (source) return;      // safety: never create a second source
        gain = c.createGain();
        gain.gain.value = vol;
        source = c.createBufferSource();
        source.buffer = buf;
        source.loop = true; // sample-accurate gapless loop
        source.connect(gain).connect(c.destination);
        source.start(0);
      } catch {
        playing = false;         // resume/decode failed -> not playing
      }
    },
    stop() {
      playing = false;           // cancels any in-flight play()
      if (source) {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        source.disconnect();
        source = null;
      }
      if (gain) {
        gain.disconnect();
        gain = null;
      }
    },
    setVolume(v: number) {
      vol = v;
      if (gain) gain.gain.value = v;
    },
    isPlaying() {
      return playing;
    },
  };
}
