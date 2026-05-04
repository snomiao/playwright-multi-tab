# playwright-multi-tab

[![Demo video](https://img.youtube.com/vi/HnVxBG7P7S4/maxresdefault.jpg)](https://youtu.be/HnVxBG7P7S4)

▶️ **[Watch the demo on YouTube](https://youtu.be/HnVxBG7P7S4)**

A fork of [Playwright](https://playwright.dev/) with multi-tab support. This monorepo aggregates patched versions of Playwright core, the Playwright CLI, and the Playwright MCP extension so that an AI agent (or human) can open and control multiple browser tabs in a single session.

## Submodules

| Submodule | Description |
|-----------|-------------|
| `lib/playwright` | Patched Playwright core with multi-tab automation support |
| `lib/playwright-cli` | CLI tool (`playwright-cli-multi-tab`) for interacting with the browser from the terminal |
| `lib/playwright-mcp` | MCP server and Chrome extension ("Playwright MCP Bridge") for connecting to an existing browser |

## Quick Start

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/snomiao/playwright-multi-tab.git
cd playwright-multi-tab

# Install and build
(cd lib/playwright && npm install && npm run build)
(cd lib/playwright-mcp && npm install && npm run build)
(cd lib/playwright-cli && npm install)

# Link the local Playwright fork into the CLI
(cd lib/playwright/packages/playwright-core && npm link)
(cd lib/playwright/packages/playwright && npm link)
(cd lib/playwright-cli && npm link playwright-core playwright)

# Link the CLI globally
(cd lib/playwright-cli && npm link)

# Verify
playwright-cli-multi-tab --help
```

## Browser Extension

The custom Chrome extension is built to:

```
lib/playwright-mcp/packages/extension/dist
```

To install: open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `dist` directory above.

Then connect via:

```bash
playwright-cli-multi-tab open --extension
```

To bypass the connection approval dialog, set your extension token:

```bash
PLAYWRIGHT_MCP_EXTENSION_TOKEN=<your-token> playwright-cli-multi-tab open --extension
```

You can find your token by clicking the extension icon in Chrome and copying the `PLAYWRIGHT_MCP_EXTENSION_TOKEN` value.

> **Important:** When the browser connects via the extension, a special connection page (`chrome-extension://.../connect.html`) opens as tab 0. **Do not close this tab** — it maintains the WebSocket relay between the CLI and the browser. Closing it will disconnect the session and all controlled tabs will become unresponsive.

## Multi-Tab Usage

Open a browser and control multiple tabs:

```bash
playwright-cli-multi-tab open --extension
playwright-cli-multi-tab tab-new
playwright-cli-multi-tab goto https://github.com
playwright-cli-multi-tab tab-new
playwright-cli-multi-tab goto https://wikipedia.org
playwright-cli-multi-tab tab-list
```

Switch between tabs:

```bash
playwright-cli-multi-tab tab-select 1
playwright-cli-multi-tab snapshot
```

## Multiple Sessions

You can run multiple independent browser sessions at the same time using the `-s` flag. Each session has its own browser instance and isolated tab list.

```bash
# Open two separate browser sessions
playwright-cli-multi-tab -s=browser1 open --extension
playwright-cli-multi-tab -s=browser2 open --extension

# Each session manages its own tabs independently
playwright-cli-multi-tab -s=browser1 tab-new
playwright-cli-multi-tab -s=browser1 goto https://github.com
playwright-cli-multi-tab -s=browser1 tab-new
playwright-cli-multi-tab -s=browser1 goto https://wikipedia.org

playwright-cli-multi-tab -s=browser2 tab-new
playwright-cli-multi-tab -s=browser2 goto https://rust-lang.org
playwright-cli-multi-tab -s=browser2 tab-new
playwright-cli-multi-tab -s=browser2 goto https://nodejs.org

# List tabs per session — each shows only its own tabs
playwright-cli-multi-tab -s=browser1 tab-list
# → 1: GitHub, 2: Wikipedia

playwright-cli-multi-tab -s=browser2 tab-list
# → 1: Rust, 2: Node.js
```

## License

MIT
