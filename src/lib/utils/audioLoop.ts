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
      const c = getCtx();
      if (c.state === "suspended") await c.resume(); // needs a user gesture; the toggle click provides it
      const buf = await ensureBuffer(c);
      if (playing) return;
      gain = c.createGain();
      gain.gain.value = vol;
      source = c.createBufferSource();
      source.buffer = buf;
      source.loop = true; // sample-accurate gapless loop
      source.connect(gain).connect(c.destination);
      source.start(0);
      playing = true;
    },
    stop() {
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
      playing = false;
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
