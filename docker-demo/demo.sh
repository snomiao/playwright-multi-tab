#!/bin/bash
# Demo: playwright-multi-tab CLI demo (non-extension mode)
# Chrome is launched with the extension loaded via chromium-demo wrapper.
set -e
DISPLAY="${DISPLAY:-:99}"

echo "[demo] Waiting for display..."
sleep 1

# Auto-dismiss fluxbox wallpaper error dialog
(sleep 3 && xdotool search --sync --onlyvisible --name "xmessage" key Return 2>/dev/null || true) &

# Helper: bring Chrome window to front
focus_chrome() {
  xdotool search --onlyvisible --name "Chromium" windowfocus --sync 2>/dev/null || true
  xdotool search --onlyvisible --name "Chromium" windowactivate --sync 2>/dev/null || true
  sleep 0.3
}

# Helper: switch to Chrome tab N (1-based, Ctrl+N)
chrome_tab() {
  focus_chrome
  xdotool key "ctrl+$1"
  sleep 0.5
}

# Helper: navigate Chrome's address bar (bypasses CDP)
chrome_goto() {
  focus_chrome
  xdotool key ctrl+l
  sleep 0.3
  xdotool type --clearmodifiers "$1"
  xdotool key Return
  sleep 2
}

# Write the inner terminal demo script
cat > /tmp/demo-inner.sh << 'INNER'
#!/bin/bash
export DISPLAY="${DISPLAY:-:99}"

focus_chrome() {
  xdotool search --onlyvisible --name "Chromium" windowfocus --sync 2>/dev/null || true
  xdotool search --onlyvisible --name "Chromium" windowactivate --sync 2>/dev/null || true
  sleep 0.3
}

chrome_tab() {
  focus_chrome
  xdotool key "ctrl+$1"
  sleep 0.5
}

cmd() {
  printf '\n\033[1;32m$\033[0m \033[1;37m%s\033[0m\n' "$*"
  sleep 0.5
  eval "$@"
  sleep 0.3
}

clear
printf '\033[1;36m'
echo '======================================================='
echo '   playwright-multi-tab  --  demo'
echo '   github.com/snomiao/playwright-multi-tab'
echo '======================================================='
printf '\033[0m\n'
sleep 2

echo '+-- How it works ----------------------------------------+'
echo ''
echo '  1. Install "Playwright MCP Bridge" extension in Chrome'
echo '  2. Run: playwright-cli-multi-tab open'
echo '  3. Control any tab, any session from the CLI'
echo ''
sleep 2

echo '+-- Step 1: Open browser (extension pre-loaded) ----------+'
echo ''
cmd 'playwright-cli-multi-tab open'
sleep 3
focus_chrome
sleep 2

echo ''
echo '+-- Step 2: Navigate multiple tabs -----------------------+'
echo ''

cmd 'playwright-cli-multi-tab goto https://github.com/snomiao/playwright-multi-tab'
sleep 5
chrome_tab 1
sleep 3

cmd 'playwright-cli-multi-tab tab-new'
sleep 1
cmd 'playwright-cli-multi-tab goto https://playwright.dev'
sleep 5
chrome_tab 2
sleep 3

cmd 'playwright-cli-multi-tab tab-new'
sleep 1
cmd 'playwright-cli-multi-tab goto https://en.wikipedia.org/wiki/Browser_automation'
sleep 5
chrome_tab 3
sleep 3

echo ''
cmd 'playwright-cli-multi-tab tab-list'
sleep 2

echo ''
echo '+-- Switching between tabs --------------------------------+'
cmd 'playwright-cli-multi-tab tab-select 0'
sleep 0.5
chrome_tab 1
sleep 2.5
cmd 'playwright-cli-multi-tab snapshot'
sleep 2

cmd 'playwright-cli-multi-tab tab-select 1'
sleep 0.5
chrome_tab 2
sleep 2.5

echo ''
echo '+-- Step 3: Independent sessions -------------------------+'
echo ''

cmd 'playwright-cli-multi-tab -s=session2 open'
sleep 3
cmd 'playwright-cli-multi-tab -s=session2 goto https://nodejs.org'
sleep 5
focus_chrome
sleep 1

echo ''
cmd 'playwright-cli-multi-tab tab-list'
echo ''
cmd 'playwright-cli-multi-tab -s=session2 tab-list'
sleep 2

echo ''
echo '+-- Cleanup ----------------------------------------------+'
cmd 'playwright-cli-multi-tab close-all'
sleep 1
cmd 'playwright-cli-multi-tab -s=session2 close-all'
sleep 1
printf '\033[1;32m  OK: Demo complete.\033[0m\n'
sleep 3
INNER
chmod +x /tmp/demo-inner.sh

echo "[demo] Starting xterm with demo script..."
xterm \
  -display "${DISPLAY}" \
  -geometry 80x42+0+0 \
  -bg '#0d1117' -fg '#c9d1d9' \
  -fa 'Monospace' -fs 12 \
  -T 'playwright-cli-multi-tab demo' \
  -e bash /tmp/demo-inner.sh

echo "[demo] xterm finished."
