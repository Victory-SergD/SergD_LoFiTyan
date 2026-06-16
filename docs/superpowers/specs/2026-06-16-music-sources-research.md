# LoFiTyan — Music Sources Research (free + paid)

**Date:** 2026-06-16 · two research rounds (free sources, then paid/premium). Driving question: where do we get **high-quality, well-curated** lo-fi for a **branded, client-only Tauri desktop app** (Victory), and is paid worth it?

The hard filter throughout: **type-B** = the source lets a third-party branded app *stream its catalog to users* (what we need) vs **type-A** = licenses tracks only for *your own content* (videos/podcasts) and forbids building a player. Most "royalty-free" libraries are type-A — useless to us.

---

## ✅ Decision (current)

Build the station picker on the **FREE curated model**: a hand-vetted HQ radio whitelist ("LoFiTyan Picks", ~12–15 stations, genre-tagged) + a "More" tab from **radio-browser.info** filtered by `bitrateMin` + `is_https`. Reasons: best *reliable* quality (we cherry-pick fidelity), free, zero contract risk, native to Tauri's `<audio>`. Nothing paid clearly beats it out-of-the-box for an indie right now.

Paid is a **"prove the quote first"** decision, not an automatic upgrade. The architecture (stations with stream URLs) is identical, so a paid premium tier can be layered on later without rework.

---

## Free sources (round 1)

- **radio-browser.info** (what we use) — free API, browsable by tag, filterable by `bitrateMin`/`codec`/`is_https`/`hidebroken`. Quality ceiling is real: **320 kbps** (REYFM #LOFI) and many **192 kbps** stations exist — we just weren't filtering. Variable/community quality → curate a whitelist + filter. Score 4/5.
- **Curated HQ whitelist** — industry-standard approach for lofi apps. We pick the best streams. Verified alive (HTTPS): I♥Chillhop 192k, loficafe Chilling 192k, REYFM #LOFI 320k (redirect). Best *controlled* quality. Maintenance: ~2–4 streams/yr (mitigate with CDN-hosted JSON + health checks). Legality: email the ~8 best stations for written permission; SomaFM requires it.
- **Audius** — free client-only API, 320 kbps, real lofi tracks, genre/mood search. But user-uploaded (320k container ≠ guaranteed source fidelity), per-track OML license + attribution, CORS to test. Good future "tracks mode". Score 4/5.
- **SomaFM** — only **lossless (FLAC)** option, but ambient (not pure lofi) + requires written permission. Niche.
- **Not viable:** YouTube/Lofi Girl streams (ToS bans hidden-player audio — incompatible with our scene), Spotify (30s previews + Premium), SoundCloud (API closed), Apple Music (subscription/platform-locked), Jamendo (commercial needs paid license), FMA (dead API).

## Paid / premium sources (round 2)

Only **4** options are genuinely type-B (can power our app):

| # | Source | What | Cost | Catch |
|---|--------|------|------|-------|
| 1 | **Feed.fm** | Licensed music API built for apps; plays via HTML5 `<audio>` (native to Tauri, no backend). Real lofi stations (Lo-fi Focus, Chill Beats, Smooth Downtempo, Peaceful Piano). PRO-licensed + indemnified. | Quote-only, ~**$500–2,000+/mo**. Marquee clients are mid/large → min deal may be steep pre-revenue. | Opaque pricing; client-side token+secret (no backend to hide keys); CORS to verify; lofi present but not their core. |
| 2 | **Mubert API** | Self-serve type-B with lofi/ambient specialization; REST+WebRTC. | Transparent: **$49 trial / $199 / $499** (sublicensing) or $0.01/min. Cheapest real entry. | **AI-generated** (not curated human lofi; ~40% need retry → less "premium"); ToS contradicts marketing → need written OK from business@mubert.com. |
| 3 | **Lofi Girl / Chillhop** (bespoke) | The dream brand + curation. Lofi Girl's commercial form even lists "applications". | **$10K–50K+/yr**, months, via Warner Chappell (Lofi Girl). | Type-A by default, type-B negotiable; no off-the-shelf API; slow + costly. Ships later, not first. |
| 4 | **Tuned Global** | Real white-label streaming platform (150M+ tracks; you keep revenue, fixed tech fee). | Enterprise, ~**$10K–100K+/yr**, multi-month licensing. | Over-scaled for indie; server-leaning (clashes with no-backend). Revisit at scale. |

**Dead-ends (look tempting, can't use):** Epidemic Sound, Artlist, Musicbed, Uppbeat, Soundstripe, Audiio, Soundraw (all type-A / "no streaming app"), TIDAL (no commercial), Deezer (per-user Premium), SoundCloud (banned), 7digital (server-side OAuth needed → breaks no-backend), Napster/Rhapsody (defunct ~Jan 2026), Soundtrack Your Brand / Pandora / Rockbot (venue-only), Live365/RadioKing/Zeno (infra only, no licensed catalog), Monstercat/NCS (wrong genre).

---

## Recommendation (honest)

1. **Now:** keep the free curated plan as the default tier and build the picker on it — it's a fair commercial baseline.
2. **Parallel business moves (user-driven, not code):** get a **Feed.fm** demo+quote (the only true type-B, indemnified, lofi-capable, Tauri-native option) — and if the number lands in indie range, it becomes a real, chargeable **premium tier**. Send **Lofi Girl** ("applications" on their form) + **Chillhop** bespoke pitches as slow strategic plays.
3. **Skip** a Mubert-class AI tier as the premium identity — it's only marginally better than free curated and feels *less* premium.

Net: the free curated whitelist is the right thing to ship; paid only earns its place once a Feed.fm quote (or a Lofi Girl deal) proves out.
