# Cloudflare QA — Audio coverage audit (2026-11-02)

## Scope and findings

The live city and the separate scenario Studio have **different** audio engines and must not be conflated.

| Feature | Live 3D city | Isolated Studio | Evidence |
|---|---|---|---|
| Rain and wind | Web Audio procedural noise filtered by rain intensity | Procedural noise layer | `lib/city/soundscape.ts`; Chromium test |
| Birds | Short oscillator chirp in daytime and low rain | Some synthetic cat calls | Chromium test and source |
| Thunder, storm accents | **Not implemented** | **Not implemented as a weather system** | Source audit |
| Car/motorbike engine, horn, bicycle bell | **Not implemented** | No fleet-correlated SFX | No per-vehicle signal/audio bus |
| Bus and metro | **Not implemented** | Not a fleet simulation | Transit rendering does not use AudioContext |
| Footsteps, props, event chimes | **Not implemented for live city** | Procedural footsteps, rustle, select scripted effects | `components/studio/sound.ts` |
| Spoken resident conversations | **Not implemented for live city** | 21 OGG Vietnamese voice clips in four authored scripts | Studio manifest and browser decode |
| Animals, pets | No live animal audio | Procedural kitten cue in one Studio script | Source audit |
| Festival, commerce, traffic events | No dedicated live sound events | A handful of four-scenario scripted event cues | Source audit |
| Spatial position/occlusion | None | Not a full 3D spatial acoustic system | Neither engine uses positional PannerNode |

### Integrity and consent

The 21 Studio recordings are **generated** from one documented, attributed Vietnamese Piper voice model, not 21 separate cast voices. `public/audio/studio/manifest.json` lists per-clip SHA-256 and timings. StudioSound verifies hashes and decodes real `AudioBuffer` objects. `public/audio/studio/LICENSE.txt` includes source and licensing. Do not misrepresent the speech as a recording of a named actor.

Live-city ambient audio is opt-in by clicking **Âm thanh thiên nhiên**. AudioContext must not start before that gesture. It must suspend on world pause, tab hidden and the OpenStreetMap view, and close when disabled or unmounted. Studio is separately opt-in. Never use audio playback to create synthetic agent interactions, trips, D1 evidence or reward.

### CI enforcement added in this change

The contextual-social CI runs two real Chromium tests against an **isolated loopback fixture**, alongside existing 3D visual checks:

- `scripts/qa-soundscape.py`: desktop/mobile opt-in, real oscillator output measurement, pause/resume, visibility, view changes, unsupported AudioContext, 320px layout and lifecycle disposal.
- `scripts/qa-studio-sound.py`: real 21-clip decode, four scripted voice outputs, waveform/RMS, seeking, pause, hidden/mute, navigation cleanup, missing clip, unsupported AudioContext. Outputs screenshots, metrics and browser errors in the existing CI artifact.

The test proves browser audio graph/output operation in Chromium SwiftShader, **not physical speaker acoustics, multi-device audio latency, subjective quality, or that absent city sounds exist**.

### Recommended next implementation

1. Dedicated city audio bus with capped voice count, master attenuation and spatial/distance gain. Drive effects only from observed events (car stop/horn decision, actual pedestrian step, transit doors, animal pose, recorded speech), never from invented interactions.
2. Quality-screened and properly licensed short sounds for road vehicles, rail, city objects, events, animals, human environment; quiet opt-in defaults, no excessive horns or loops.
3. For resident conversation, use authored or generated Vietnamese speech with verified speaker/text alignment, explicit provenance and caching, privacy controls, fallback captions. Do not map 21 Studio scripted utterances to arbitrary resident dialogue.
4. QA: no overlap explosions or AudioContext leaks, tab/background pause, 30/60 minute soak, voice cap, measured decode and peak/RMS, iOS/Android autoplay controls and device listening review.

Do not enable model treatment or alter QA D1/Cron as part of the audio work.
