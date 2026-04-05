# Docker Demo Recording

Records a demo video of `playwright-cli-multi-tab` running inside a Docker Linux VM.

## Prerequisites

- Docker installed (tested on Mac M-series with `--platform linux/arm64`)
- Built extension dist at `../tmp/docker-demo/extension-dist/` (or copy your own)
- CLI files: `playwright-cli.js`, `package.json`, `package-lock.json` (copy from repo root)

## Setup

Copy the required CLI files and extension into this directory before building:

```bash
cp ../playwright-cli.js .
cp ../package.json .
cp ../package-lock.json .
cp -r ../tmp/docker-demo/extension-dist ./extension-dist
```

Then patch the extension auth token for demo (skips approval dialog):

```bash
EXT_DIR=./extension-dist node patch-token.js
```

> The build also applies two patches to playwright-core for extension mode compatibility:
> - `patch-context.js` — fixes `newTab()` race condition in `context.js`
> - `patch-cdp-relay.js` — fixes `Target.createTarget` in extension mode by using the extension's `createTab` command so new tabs are properly registered for CDP event forwarding

## Build & Run

```bash
# Build ARM64 image (native on Mac M-series)
docker build --platform linux/arm64 -t playwright-demo .

# Record demo to ../tmp/output/
mkdir -p ../tmp/output
docker run --rm --platform linux/arm64 \
  -v "$(pwd)/../tmp/output:/output" \
  playwright-demo
```

Output: `../tmp/output/screen-recording.mp4`

## What the demo shows

1. `playwright-cli-multi-tab open` — spawns Chromium with extension pre-loaded
2. `goto` — navigates to GitHub, playwright.dev, Wikipedia
3. `tab-new` + `tab-select` — opens and switches between multiple tabs
4. `tab-list` + `snapshot` — lists tabs and takes a page snapshot
5. `-s=session2 open` — opens an independent second browser session
6. `close-all` — cleanup

## Architecture

- **Xvfb**: Virtual display (1280×800)
- **fluxbox**: Lightweight window manager
- **ffmpeg x11grab**: Screen capture at 30fps
- **xterm**: Terminal emulator running the demo script
- **chromium-demo wrapper**: apt Chromium with `--load-extension` and `--window-position=640,0`
