#!/bin/bash
# Demo: playwright-multi-tab CLI with --extension mode
# Shows: (1) extension connects to browser, (2) open --extension, (3) multi-tab control
set -e
DISPLAY="${DISPLAY:-:99}"

echo "[demo] Waiting for display..."
sleep 1

cat > /tmp/demo-inner.sh << 'INNER'
#!/bin/bash
cd /demo

export DISPLAY="${DISPLAY:-:99}"
export PLAYWRIGHT_MCP_EXECUTABLE_PATH=/usr/local/bin/chromium-demo
export PLAYWRIGHT_MCP_EXTENSION_TOKEN=DEMO_FIXED_TOKEN_FOR_RECORDING
export PWMCP_TEST_CONNECTION_TIMEOUT=30000

focus_chrome() {
  xdotool search --onlyvisible --class "Chromium" windowfocus --sync 2>/dev/null || true
  xdotool search --onlyvisible --class "Chromium" windowactivate --sync 2>/dev/null || true
  sleep 0.3
}

chrome_tab() {
  focus_chrome
  xdotool key "ctrl+$1"
  sleep 0.5
}

show_cmd() {
  printf '\033[1;32m$\033[0m \033[1;37m%s\033[0m\n' "$*"
  sleep 0.3
}

# Truncate long lines (URLs in tab list can be very long)
truncate_output() {
  while IFS= read -r line; do
    if [ ${#line} -gt 76 ]; then
      printf '%s\033[2m…\033[0m\n' "${line:0:75}"
    else
      printf '%s\n' "$line"
    fi
  done
}

cmd() {
  show_cmd "$*"
  eval "$@" | truncate_output
  sleep 0.3
}

section() {
  clear
  printf '\033[1;36m'
  echo '======================================================='
  echo "   $*"
  echo '======================================================='
  printf '\033[0m\n'
  sleep 0.5
}

clear
printf '\033[1;36m'
echo '======================================================='
echo '   playwright-multi-tab  --  demo'
echo '   github.com/snomiao/playwright-multi-tab'
echo '======================================================='
printf '\033[0m\n'
sleep 1

echo '  1. Install "Playwright MCP Bridge" extension'
echo '  2. Run: playwright-cli-multi-tab open --extension'
echo '  3. CLI connects to YOUR Chrome via extension relay'
echo '  4. Control tabs / sessions from CLI or AI agents'
sleep 2

# ── Step 1: Connect ───────────────────────────────────────
section 'Step 1: Connect CLI to existing Chrome'
# Pre-launch Chrome so the extension CLI can open its connect page as a new tab
# (Chrome blocks chrome-extension:// URLs as startup args, but allows them in new tabs)
/usr/local/bin/chromium-demo about:blank &
sleep 2

show_cmd 'playwright-cli-multi-tab open --extension'
playwright-cli-multi-tab open --extension &
OPEN_PID=$!

echo '  Connecting via extension relay...'
sleep 4

echo '  Waiting for extension relay...'
wait $OPEN_PID
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  printf '\033[1;32m  ✓ Browser connected via extension relay!\033[0m\n'
else
  printf '\033[1;31m  ERROR: Connection failed\033[0m\n'
  exit 1
fi
sleep 0.5

# Show Chrome: open extensions tab to prove extension is installed
focus_chrome
sleep 0.5
xdotool key ctrl+t
sleep 0.6
xdotool key ctrl+l
sleep 0.2
xdotool type --clearmodifiers --delay 15 "chrome://extensions"
xdotool key Return
sleep 3
focus_chrome
sleep 2
# Close extensions tab (return to connect.html)
xdotool key ctrl+w
sleep 0.8
focus_chrome
sleep 0.8

# ── Step 2: Multi-tab navigation ─────────────────────────
section 'Step 2: Navigate multiple tabs'

cmd 'playwright-cli-multi-tab tab-new'
sleep 0.5
cmd 'playwright-cli-multi-tab goto https://github.com/snomiao/playwright-multi-tab'
sleep 4
focus_chrome; chrome_tab 2; sleep 2.5

clear
cmd 'playwright-cli-multi-tab tab-new'
sleep 0.5
cmd 'playwright-cli-multi-tab goto https://playwright.dev'
sleep 4
focus_chrome; chrome_tab 3; sleep 2.5

clear
cmd 'playwright-cli-multi-tab tab-new'
sleep 0.5
cmd 'playwright-cli-multi-tab goto https://en.wikipedia.org/wiki/Browser_automation'
sleep 4
focus_chrome; chrome_tab 4; sleep 2.5

clear
cmd 'playwright-cli-multi-tab tab-list'
sleep 2

# ── Step 3: Tab switching ────────────────────────────────
section 'Step 3: Switch between tabs'

cmd 'playwright-cli-multi-tab tab-select 0'
sleep 0.3
focus_chrome; chrome_tab 2; sleep 2
cmd 'playwright-cli-multi-tab snapshot'
sleep 1.5

clear
cmd 'playwright-cli-multi-tab tab-select 1'
sleep 0.3
focus_chrome; chrome_tab 3; sleep 2.5

# ── Step 4: Independent sessions ────────────────────────
section 'Step 4: Independent sessions'
echo '  Session 1 (default) is already connected to the first browser.'
echo '  Now open a second, completely independent browser session.'
sleep 1.5

# Minimise session1's Chrome before launching session2 (avoids visual confusion)
playwright-cli-multi-tab tab-select 1 > /dev/null 2>&1 || true

show_cmd 'playwright-cli-multi-tab -s=session2 open --extension'
playwright-cli-multi-tab -s=session2 open --extension &
OPEN2_PID=$!
sleep 4

wait $OPEN2_PID || true
printf '\033[1;32m  ✓ Session2 connected!\033[0m\n'
sleep 0.5

clear
cmd 'playwright-cli-multi-tab -s=session2 goto https://nodejs.org'
sleep 4

# Now show session1's GitHub tab (session1 browser is still running)
focus_chrome; chrome_tab 2; sleep 2

clear
echo '+-- Both sessions running independently ------------------+'
echo ''
cmd 'playwright-cli-multi-tab tab-list'
sleep 1
cmd 'playwright-cli-multi-tab -s=session2 tab-list'
sleep 2

# ── Cleanup ──────────────────────────────────────────────
section 'Done!'
printf '\033[1;32m'
echo '  playwright-cli-multi-tab: connect CLI to your Chrome'
echo '  via the "Playwright MCP Bridge" extension.'
echo '  github.com/snomiao/playwright-multi-tab'
printf '\033[0m\n'
sleep 2
playwright-cli-multi-tab close-all > /dev/null 2>&1 || true
playwright-cli-multi-tab -s=session2 close-all > /dev/null 2>&1 || true
sleep 1
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
