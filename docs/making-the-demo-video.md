# Making the playwright-multi-tab Demo Video

A narrative tutorial on how we recorded a ~2:44 automated demo — from architecture design to final render, including everything that broke along the way.

---

## Overview

The goal was a fully automated, reproducible demo video for `playwright-multi-tab` — no manual screen recording, no live performance anxiety. Someone should be able to `docker run` and get a polished MP4. What we ended up with is a two-pass pipeline: record video silently, generate TTS audio separately, then mix them in post.

```
┌─────────────────────────────────────────────────────────┐
│  Pass 1: Silent video                                   │
│  Xvfb (virtual display) → ffmpeg x11grab → .mp4        │
├─────────────────────────────────────────────────────────┤
│  Pass 2 (offline): TTS audio                            │
│  generate-narration.py → Gemini 2.5 Flash TTS           │
│  → individual .wav files → narration_track.wav          │
├─────────────────────────────────────────────────────────┤
│  Post-mix: overlay audio onto video                     │
│  ffmpeg adelay filter (audio_delay = demo_start        │
│  - ffmpeg_start) + burn subtitles from meta.json        │
└─────────────────────────────────────────────────────────┘
```

The key insight is that the demo script is **narration-driven**: each section of the script waits exactly as long as its TTS audio clip lasts, so audio and video stay in sync without any runtime playback — the WAV is dropped in during post-processing with a single timing offset.

---

## Repository Layout

```
docker-demo/
  Dockerfile              # recording environment
  record.sh               # container entrypoint + post-processing
  demo.sh                 # demo script (narration-driven)
  generate-narration.py   # TTS generation (Gemini API)
  narration/
    *.wav                 # individual TTS segments
    narration_track.wav   # concatenated full track
    durations.sh          # sourced by demo.sh: DUR_XX vars (ms)
    meta.json             # segment metadata for subtitle gen
```

---

## The Recording Environment (Dockerfile)

The Docker image is built on `node:22-bookworm` (ARM64-native — no QEMU needed on Apple Silicon). Key packages:

```
xvfb x11-utils       # virtual X display
ffmpeg               # screen capture + post-mix
xterm fluxbox        # terminal emulator + window manager
xdotool              # synthetic keyboard/mouse events
chromium             # browser (apt, arm64-native)
```

A wrapper script `/usr/local/bin/chromium-demo` launches apt Chromium with the pre-loaded extension and fixed window position:

```bash
exec /usr/bin/chromium --load-extension=/ext/dist \
     --disable-extensions-except=/ext/dist \
     --no-first-run --no-default-browser-check \
     --no-sandbox --window-position=640,0 --window-size=640,800 "$@"
```

The extension ID is fixed by patching the manifest with a public key so `PLAYWRIGHT_MCP_EXTENSION_TOKEN=DEMO_FIXED_TOKEN_FOR_RECORDING` always resolves correctly.

---

## Container Entrypoint: record.sh

`record.sh` is the container's `CMD`. It orchestrates the whole recording session:

1. Start `Xvfb :99` — a virtual 1280x800x24 display. Nothing renders to a physical screen.
2. Start `fluxbox` — a minimal window manager so windows can be focused and moved.
3. Dismiss the fluxbox wallpaper error dialog (`xdotool search --onlyvisible --name "xmessage" key Return`).
4. Start `ffmpeg` in the background, capturing `:99.0` at 30 fps with `libx264 ultrafast`.
5. Run `demo.sh` and pipe output to `demo.log`.
6. Kill ffmpeg (this finalizes `screen-recording.mp4`).

> At the time of writing, the post-mix step (audio overlay + subtitles) is done in a separate local pass after reviewing the raw recording. The plan is to fold it into `record.sh` so the container outputs a finished `screen-recording-final.mp4` directly.

---

## The Demo Script: demo.sh

`demo.sh` launches an `xterm` with specific dimensions (80x42 columns, dark GitHub theme colors) and runs the actual demo inside it. The terminal is pinned to the left half of the 1280x800 display; Chrome occupies the right half.

### Structure

The demo covers four sections:

| Section | Content |
|---------|---------|
| Step 1  | Connect CLI to existing Chrome via extension relay |
| Step 2  | Navigate multiple tabs (GitHub, playwright.dev, Wikipedia) |
| Step 3  | Switch between tabs + take accessibility snapshot |
| Step 4  | Independent sessions with `-s=session2` flag |

### Narration-Driven Timing Pattern

The core innovation. Each narration segment has a known audio duration (pre-computed by `generate-narration.py`). The demo script sources `durations.sh`, which looks like:

```bash
DUR_intro=8200
DUR_chrome_launch=6100
DUR_connecting=5800
# ... 17 more segments
```

Two shell functions implement the timing:

```bash
narrate() {
  local name="$1"
  local elapsed_ms=$(( $(date +%s%3N) - DEMO_START_MS ))
  local var="DUR_${name//-/_}"
  __NARRATE_DUR_MS="${!var:-4000}"
  echo "${DEMO_START_MS}|${elapsed_ms}|${__NARRATE_DUR_MS}|${2}" >> narration_log.txt
  __NARRATE_START_MS=$(date +%s%3N)
}

narrate_end() {
  local remaining=$(( __NARRATE_DUR_MS - ($(date +%s%3N) - __NARRATE_START_MS) ))
  [ "$remaining" -gt 50 ] && sleep "$(awk "BEGIN{printf \"%.3f\", ${remaining}/1000}")"
}
```

Usage in the demo:

```bash
narrate "chrome_launch" "First, let's launch Chrome with the extension pre-loaded."
/usr/local/bin/chromium-demo about:blank &
sleep 2
narrate_end
# This section takes exactly DUR_chrome_launch milliseconds total
```

Why this works: since audio segments are pre-concatenated in order into a single `narration_track.wav`, the elapsed time at the start of segment N equals the sum of durations of segments 0..N-1. When we overlay the WAV with a fixed `adelay` (the gap between ffmpeg start and demo start), every `narrate()` call aligns with the corresponding position in the WAV.

---

## TTS Generation: generate-narration.py

Run this once, offline, before building the Docker image. It calls Gemini 2.5 Flash TTS (or newer models) concurrently for all 20 segments, then concatenates the results.

### The 20 Narration Segments

The script covers every action continuously — no silent gaps:

```
intro → chrome_launch → open_extension → connecting → connected
→ extensions_verify → relay_tab_warning → step2_multi_tab
→ github_navigation → playwright_dev → wikipedia → tab_list
→ step3_tab_switching → snapshot → tab_select → step4_sessions
→ session2_open → nodejs → both_sessions → done
```

Total: ~161.8 seconds of continuous narration.

### Gemini TTS Returns Raw PCM

One early surprise: the Gemini TTS API returns `audio/L16;codec=pcm;rate=24000`, not a WAV file. Playing it directly produces noise. The fix is to prepend a WAV header using Python's `wave` module before doing anything else:

```python
import wave, struct

def pcm_to_wav(pcm_bytes: bytes, sample_rate=24000, channels=1, sampwidth=2) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sampwidth)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_bytes)
    return buf.getvalue()
```

The script generates three outputs:

- `narration/*.wav` — one WAV per segment
- `narration/narration_track.wav` — all segments concatenated in order
- `narration/durations.sh` — `DUR_XX=NNNN` lines for demo.sh to source
- `narration/meta.json` — segment metadata (text, duration_ms, cumulative_ms) for subtitle generation

---

## Audio Post-Mix Logic

After `screen-recording.mp4` is produced:

```bash
# Timestamps written by record.sh
FFMPEG_START_MS=<epoch ms when ffmpeg started>
DEMO_START_MS=<epoch ms when demo.sh started>

# Delay to apply to the audio track
AUDIO_DELAY_MS=$(( DEMO_START_MS - FFMPEG_START_MS ))
# Typically ~2000ms
```

Single ffmpeg command to overlay narration:

```bash
ffmpeg -y \
  -i screen-recording.mp4 \
  -i narration/narration_track.wav \
  -filter_complex "[1:a]adelay=${AUDIO_DELAY_MS}|${AUDIO_DELAY_MS}[aout]" \
  -map 0:v -map "[aout]" \
  -c:v copy -c:a aac \
  screen-recording-narrated.mp4
```

Subtitles are generated deterministically from `meta.json`: each segment's start time is `AUDIO_DELAY_MS + cumulative_ms_of_previous_segments`. The subtitle file is burned in with `-vf subtitles=subs.ass`.

---

## What Broke (and How We Fixed It)

### 1. Chrome extension relay tab gets closed

The WebSocket relay lives in `connect.html` (tab 0). Early demo scripts used `xdotool key ctrl+w` to close the "chrome://extensions" verification tab after showing it to the camera. Sometimes `ctrl+w` closed the wrong tab — specifically `connect.html` — which silently dropped the relay connection, causing all subsequent CLI commands to hang.

**Fix:** Use `playwright-cli-multi-tab tab-select 0` instead of xdotool key sequences when you need to return to the relay tab. This is explicit and doesn't depend on tab focus state.

### 2. Audio segments overlapping

The first prototype played audio live during recording using `paplay segment.wav &` (background subprocess). The result: all 20 audio clips started playing at roughly the same time, producing a wall of noise.

**Fix:** The 2-pass post-mix architecture. Record silent video; mix audio in post. This also makes re-recording the audio trivial without re-recording the video.

### 3. 25-second silence gap in the middle

The first narration script had only 10 segments and left a ~25-second window during page load animations with no audio — just the sound of nothing. Viewers would assume the video froze.

**Fix:** Expand from 10 to 20 segments, with every visual action (including "waiting for page to load") covered by a narration segment. The `narrate`/`narrate_end` pattern ensures the script pauses just long enough to fill the audio without over-waiting.

### 4. Chrome blocks extension URLs at startup

The original demo script passed `chrome-extension://mml.../connect.html` as a command-line argument to Chromium. Chrome refuses to load `chrome-extension://` URLs as startup arguments (`ERR_BLOCKED_BY_CLIENT`).

**Fix:** Launch Chrome with `about:blank` first, wait 2 seconds, then call `playwright-cli-multi-tab open --extension`. The CLI opens the relay tab as a new tab from inside the running browser — which Chrome permits.

```bash
/usr/local/bin/chromium-demo about:blank &
sleep 2
playwright-cli-multi-tab open --extension
```

### 5. Manifest V2 extensions dropped in Chromium 146

Chromium 146 removed MV2 extension support. Two extensions we were loading for realism (uBlock Origin, Tampermonkey) stopped loading.

**Fix:** Switch to MV3 equivalents — uBOL (uBlock Origin Lite) for ad blocking and ISDCAC for userscripts. Updated the Dockerfile accordingly.

### 6. Timing drift accumulation

Bash process startup overhead adds ~10–50ms per segment. Over 20 segments and ~161 seconds, this accumulates to roughly 1.65 seconds of drift. The narration audio ends slightly before the demo's visual section does.

**Acceptable for now:** Since narration leads visuals (the audio announces what's about to happen), the drift feels natural rather than jarring. For a production-quality video, a sync pulse (a visual cue embedded in the recording that can be matched to a marker in the WAV) would allow frame-accurate alignment.

---

## Quick Start: Reproduce the Video

### Prerequisites

- Docker (arm64 or amd64)
- Python 3.10+
- `GOOGLE_GENERATIVE_AI_API_KEY` set in `docker-demo/.env.local`

### Step 1 — Generate TTS audio

```bash
cd docker-demo
python3 generate-narration.py
# Outputs: narration/narration_track.wav
#          narration/durations.sh
#          narration/meta.json
```

This step is idempotent and only needs to re-run when narration text changes.

### Step 2 — Build Docker image

```bash
docker build -t playwright-demo:latest .
```

### Step 3 — Record

```bash
mkdir -p ../tmp/output
docker run --rm \
  -v "$(pwd)/../tmp/output:/output" \
  playwright-demo:latest
```

Output files appear in `tmp/output/`:
- `screen-recording.mp4` — raw silent video
- `demo.log` — full demo output for debugging

### Step 4 — Post-mix audio (local)

```bash
FFMPEG_START_MS=$(cat ../tmp/output/ffmpeg_start_ms.txt)
DEMO_START_MS=$(cat ../tmp/output/demo_start_ms.txt)
AUDIO_DELAY_MS=$(( DEMO_START_MS - FFMPEG_START_MS ))

ffmpeg -y \
  -i ../tmp/output/screen-recording.mp4 \
  -i narration/narration_track.wav \
  -filter_complex "[1:a]adelay=${AUDIO_DELAY_MS}|${AUDIO_DELAY_MS}[aout]" \
  -map 0:v -map "[aout]" \
  -c:v copy -c:a aac \
  ../tmp/output/screen-recording-narrated.mp4
```

### Step 5 — Generate thumbnail (optional)

```bash
python3 generate-thumbnail.py
# Uses gemini-3-pro-image-preview REST API
# Outputs: thumbnail.jpg
```

### Step 6 — Prepend thumbnail as 3-second intro frame

```bash
ffmpeg -y \
  -loop 1 -t 3 -i thumbnail.jpg \
  -i ../tmp/output/screen-recording-narrated.mp4 \
  -filter_complex \
    "[0:v]scale=1280:800,setsar=1[t];
     [1:v]scale=1280:800,setsar=1[m];
     [t][m]concat=n=2:v=1:a=0[v];
     [1:a]adelay=3000|3000[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -c:a aac \
  ../tmp/output/final.mp4
```

---

## Architecture Diagram

```
                     HOST MACHINE
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  generate-narration.py  ──►  narration/narration_track.wav  │
│         (Gemini TTS)          narration/durations.sh        │
│                               narration/meta.json           │
│                                                              │
│  docker build   ──►  playwright-demo:latest                 │
│    (bakes in narration/durations.sh)                        │
│                                                              │
│  docker run ──────────────────────────────────────────────┐ │
│  │   CONTAINER                                            │ │
│  │   Xvfb :99  ──►  ffmpeg x11grab  ──►  screen-         │ │
│  │                                       recording.mp4   │ │
│  │   demo.sh (narration-driven timing)                   │ │
│  │     Chromium + extension relay                        │ │
│  │     playwright-cli-multi-tab commands                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  POST-MIX (local ffmpeg)                                    │
│    screen-recording.mp4  ──┐                                │
│    narration_track.wav   ──┤  ffmpeg adelay + subtitles    │
│    (audio_delay offset)    └──►  screen-recording-final    │
│                                                              │
│  OPTIONAL: prepend thumbnail.jpg (3s static frame)         │
│                                    ──►  final.mp4          │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

**Why not record audio live?**
Live audio means `paplay` or `aplay` subprocesses racing against the demo script. Getting them to stop and start cleanly in Bash is fragile. Post-mix gives full control and lets you iterate on audio without re-recording.

**Why a single WAV track rather than N separate overlays?**
A single `adelay` is one ffmpeg filter. N separate overlays would require N `amix` inputs. The single-track approach is simpler and more reliable — as long as segments are concatenated in the same order the demo runs them.

**Why Docker for recording?**
Reproducibility. The same Docker image produces the same video regardless of the host OS. Xvfb runs headless — no display server needed on CI. This also means the recording can run on a VPS or GitHub Actions.

**Why xterm + bash rather than something higher-level?**
The demo is meant to look like a real terminal session. `xterm` with a dark GitHub color scheme looks exactly like what a developer would actually see. Any higher-level "terminal emulator simulation" tool would add visible artifacts or lose the real terminal feel.

---

## Lessons Learned

1. **Write the narration first.** The narration script drives everything — segment count, timing, what actions appear on screen. Start there and work backward to the demo script.

2. **Pre-compute all durations before recording.** `generate-narration.py` runs in seconds and produces `durations.sh`. Don't hardcode sleep values; they'll drift as the narration evolves.

3. **Keep segments short.** Long segments (>10s) accumulate drift and are hard to adjust if you need to re-record one section. Aim for 5–8 seconds per segment.

4. **Log timestamps.** `record.sh` writes `ffmpeg_start_ms.txt` and `demo_start_ms.txt` at the moment each process starts. Without these, computing `adelay` requires manual frame-counting.

5. **Test with a 3-segment mock first.** Before recording the full 20-segment demo, run a 3-segment version and check that the WAV lines up with the video. Much faster to iterate.

---

## File Reference

| File | Purpose |
|------|---------|
| `docker-demo/Dockerfile` | Build the recording container |
| `docker-demo/record.sh` | Container entrypoint: Xvfb + ffmpeg + demo |
| `docker-demo/demo.sh` | Narration-driven demo script |
| `docker-demo/generate-narration.py` | Concurrent Gemini TTS generation |
| `docker-demo/narration/durations.sh` | `DUR_XX=NNNN` variables sourced by demo.sh |
| `docker-demo/narration/meta.json` | Segment metadata for subtitle generation |
| `docker-demo/narration/narration_track.wav` | Full concatenated audio track |
