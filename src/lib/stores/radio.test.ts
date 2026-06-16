// src/lib/stores/radio.test.ts
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Minimal stand-in for HTMLAudioElement that the store can drive. Tracks the
// last `src` set, whether it's paused, and how many times play() ran.
class FakeAudio {
  src: string;
  paused = true;
  played = 0;
  listeners: Record<string, Array<() => void>> = {};
  constructor(src: string) {
    this.src = src;
  }
  play() {
    this.played++;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  addEventListener(type: string, fn: () => void) {
    (this.listeners[type] ??= []).push(fn);
  }
}

// Build a raw radio-browser-shaped station with sensible defaults.
function apiStation(over: Partial<Record<string, unknown>> = {}) {
  return {
    stationuuid: "uuid-default",
    name: "Default",
    url_resolved: "https://example.com/stream",
    favicon: "https://example.com/fav.png",
    codec: "MP3",
    bitrate: 128,
    tags: "lofi,chill",
    ...over,
  };
}

function mockFetchOk(payload: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(payload),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("loadStations (parse + filter)", () => {
  it("keeps only https stations, maps fields, and dedupes by name", async () => {
    const payload = [
      apiStation({
        stationuuid: "u1",
        name: "Lofi Alpha",
        url_resolved: "https://a.example/stream",
        favicon: "https://a.example/f.png",
        codec: "MP3",
        bitrate: 128,
        tags: "lofi",
      }),
      // http -> must be filtered out (mixed content)
      apiStation({
        stationuuid: "u2",
        name: "Lofi Beta",
        url_resolved: "http://insecure.example/stream",
      }),
      apiStation({
        stationuuid: "u3",
        name: "Lofi Gamma",
        url_resolved: "https://g.example/stream",
        codec: "AAC",
        bitrate: 256,
      }),
      // duplicate name (different case) -> deduped, the first wins
      apiStation({
        stationuuid: "u4",
        name: "lofi alpha",
        url_resolved: "https://dup.example/stream",
      }),
      // empty url -> dropped
      apiStation({ stationuuid: "u5", name: "Empty", url_resolved: "" }),
    ];
    const fetchMock = mockFetchOk(payload);
    const { loadStations, stations, listLoading, listError } = await import("./radio");

    await loadStations("lofi");

    const list = get(stations);
    // Only the two distinct https stations survive.
    expect(list.map((s) => s.id)).toEqual(["u1", "u3"]);

    const alpha = list[0];
    expect(alpha).toEqual({
      id: "u1",
      name: "Lofi Alpha",
      url: "https://a.example/stream",
      favicon: "https://a.example/f.png",
      codec: "MP3",
      bitrate: 128,
      tags: "lofi",
    });

    // listLoading is reset, no listError, and the request hit a radio-browser mirror.
    expect(get(listLoading)).toBe(false);
    expect(get(listError)).toBeNull();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain(".api.radio-browser.info/json/stations/bytag/lofi");
    expect(url).toContain("hidebroken=true");
    // No custom headers are sent (avoids any CORS preflight in the webview).
    expect(opts).toBeUndefined();
  });

  it("falls back to the next mirror when one fails, then stops", async () => {
    const good = [
      apiStation({ stationuuid: "u1", name: "Mirror Two", url_resolved: "https://m2.example/s" }),
    ];
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("mirror1 down"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(good) });
    vi.stubGlobal("fetch", fetchMock);
    const { loadStations, stations, error } = await import("./radio");

    await loadStations("lofi");

    expect(get(stations).map((s) => s.id)).toEqual(["u1"]);
    expect(get(error)).toBeNull();
    // First mirror rejected, second succeeded -> stops there (no extra calls).
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("encodes the tag in the request URL", async () => {
    const fetchMock = mockFetchOk([]);
    const { loadStations } = await import("./radio");
    await loadStations("lo fi");
    expect(fetchMock.mock.calls[0][0]).toContain("/bytag/lo%20fi?");
  });

  it("records the error and keeps stations as-is on fetch failure", async () => {
    // First a good load, then a failing one.
    mockFetchOk([
      apiStation({ stationuuid: "u1", name: "Keep Me", url_resolved: "https://k.example/s" }),
    ]);
    const { loadStations, stations, listError, listLoading } = await import("./radio");
    await loadStations("lofi");
    expect(get(stations)).toHaveLength(1);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await loadStations("lofi");

    expect(get(listError)).toBe("network down");
    expect(get(stations)).toHaveLength(1); // unchanged
    expect(get(listLoading)).toBe(false);
  });
});

describe("playback transitions (FakeAudio)", () => {
  // Load a known set of 3 stations and return the store module + created audio.
  async function setup() {
    const created: FakeAudio[] = [];
    const mod = await import("./radio");
    mod.setAudioFactory((url) => {
      const a = new FakeAudio(url);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });
    mockFetchOk([
      apiStation({ stationuuid: "u1", name: "One", url_resolved: "https://one.example/s" }),
      apiStation({ stationuuid: "u2", name: "Two", url_resolved: "https://two.example/s" }),
      apiStation({ stationuuid: "u3", name: "Three", url_resolved: "https://three.example/s" }),
    ]);
    await mod.loadStations("lofi");
    return { mod, created };
  }

  it("play() sets current, points audio at the url, and flips isPlaying true", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);

    expect(get(mod.current)?.id).toBe("u1");
    expect(get(mod.isPlaying)).toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0].src).toBe("https://one.example/s");
    expect(created[0].paused).toBe(false);
    expect(created[0].played).toBe(1);
  });

  it("reuses the single audio element across stations (single owner)", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);
    await mod.play(list[1]);
    expect(created).toHaveLength(1); // same element, new src
    expect(created[0].src).toBe("https://two.example/s");
  });

  it("pause() pauses the element and clears isPlaying but keeps current", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);
    mod.pause();
    expect(get(mod.isPlaying)).toBe(false);
    expect(get(mod.current)?.id).toBe("u1"); // retained for resume
    expect(created[0].paused).toBe(true);
  });

  it("togglePlay() pauses then resumes a current station", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);

    mod.togglePlay(); // -> pause
    expect(get(mod.isPlaying)).toBe(false);
    expect(created[0].paused).toBe(true);

    mod.togglePlay(); // -> resume
    // play() is async; allow the microtask to settle.
    await Promise.resolve();
    expect(get(mod.isPlaying)).toBe(true);
    expect(created[0].paused).toBe(false);
  });

  it("togglePlay() with no current station starts the first one", async () => {
    const { mod, created } = await setup();
    expect(get(mod.current)).toBeNull();
    mod.togglePlay();
    await Promise.resolve();
    expect(get(mod.current)?.id).toBe("u1");
    expect(created).toHaveLength(1);
  });

  it("playNext() advances and wraps around the end", async () => {
    const { mod } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]); // One
    mod.playNext();
    await Promise.resolve();
    expect(get(mod.current)?.id).toBe("u2"); // Two
    mod.playNext();
    await Promise.resolve();
    expect(get(mod.current)?.id).toBe("u3"); // Three
    mod.playNext();
    await Promise.resolve();
    expect(get(mod.current)?.id).toBe("u1"); // wrapped to One
  });

  it("playPrev() steps back and wraps around the start", async () => {
    const { mod } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]); // One
    mod.playPrev();
    await Promise.resolve();
    expect(get(mod.current)?.id).toBe("u3"); // wrapped to Three
    mod.playPrev();
    await Promise.resolve();
    expect(get(mod.current)?.id).toBe("u2"); // Two
  });

  it("an audio error event sets error and clears isPlaying", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);
    expect(get(mod.isPlaying)).toBe(true);
    // Fire the registered error listener.
    created[0].listeners["error"]?.forEach((fn) => fn());
    expect(get(mod.isPlaying)).toBe(false);
    expect(get(mod.error)).toBe("Stream failed to play");
    expect(get(mod.buffering)).toBe(false);
  });

  it("buffering reflects waiting/playing/canplay audio events", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);
    const el = created[0];

    el.listeners["waiting"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(true);

    el.listeners["playing"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(false);

    el.listeners["waiting"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(true);
    el.listeners["canplay"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(false);
  });

  it("starting playback on a new station sets buffering true until it plays", async () => {
    const { mod, created } = await setup();
    const list = get(mod.stations);
    await mod.play(list[0]);
    // play() optimistically marks buffering until 'playing'/'canplay'
    expect(get(mod.buffering)).toBe(true);
    created[0].listeners["playing"]?.forEach((fn) => fn());
    expect(get(mod.buffering)).toBe(false);
  });
});

describe("station picker store", () => {
  const sampleStation = {
    id: "x",
    name: "X",
    url: "https://x/s",
    favicon: "",
    codec: "MP3",
    bitrate: 128,
    tags: "",
  };

  it("GENRES equals ['Lo-Fi','Chillhop','Focus','Sleep']", async () => {
    const { GENRES } = await import("./radio");
    expect(GENRES).toEqual(["Lo-Fi", "Chillhop", "Focus", "Sleep"]);
  });

  it("each SEED genre has a non-empty station array", async () => {
    const { SEED, GENRES } = await import("./radio");
    for (const genre of GENRES) {
      expect(Array.isArray(SEED[genre])).toBe(true);
      expect(SEED[genre].length).toBeGreaterThan(0);
    }
  });

  it("every SEED station url starts with https://", async () => {
    const { SEED, GENRES } = await import("./radio");
    for (const genre of GENRES) {
      for (const station of SEED[genre]) {
        expect(station.url.startsWith("https://")).toBe(true);
      }
    }
  });

  it("all SEED ids are unique across the whole seed", async () => {
    const { SEED, GENRES } = await import("./radio");
    const ids: string[] = [];
    for (const genre of GENRES) {
      for (const station of SEED[genre]) {
        ids.push(station.id);
      }
    }
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("toggleFavorite adds then removes a station from favorites", async () => {
    localStorage.clear();
    const { favorites, toggleFavorite, isFavorite } = await import("./radio");

    // Add
    toggleFavorite(sampleStation);
    expect(get(favorites)).toHaveLength(1);
    expect(isFavorite("x")).toBe(true);
    expect(localStorage.getItem("lofityan.favorites")).toContain("x");

    // Remove
    toggleFavorite(sampleStation);
    expect(get(favorites)).toHaveLength(0);
    expect(isFavorite("x")).toBe(false);
  });

  it("selectStation sets current and persists last-station to localStorage", async () => {
    localStorage.clear();
    const created: FakeAudio[] = [];
    const mod = await import("./radio");
    mod.setAudioFactory((url) => {
      const a = new FakeAudio(url);
      created.push(a);
      return a as unknown as HTMLAudioElement;
    });

    await mod.selectStation(sampleStation);
    await Promise.resolve();

    expect(get(mod.current)?.id).toBe("x");
    const stored = localStorage.getItem("lofityan.last-station");
    expect(stored).not.toBeNull();
    expect(stored).toContain("x");
  });

  it("initRadio restores last station paused (no autoplay)", async () => {
    localStorage.clear();
    localStorage.setItem("lofityan.last-station", JSON.stringify(sampleStation));

    const mod = await import("./radio");
    mod.initRadio();

    expect(get(mod.current)?.id).toBe("x");
    expect(get(mod.isPlaying)).toBe(false);
  });

  it("loadStations appends bitrateMin param when > 0", async () => {
    const fetchMock = mockFetchOk([]);
    const { loadStations } = await import("./radio");
    await loadStations("lofi", 192);
    expect(fetchMock.mock.calls[0][0]).toContain("&bitrateMin=192");
  });
});
