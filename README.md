# playwright-multi-tab

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
cd playwright-multi-tab/tree/main

# Install and build
(cd lib/playwright && npm install && npm run build)
(cd lib/playwright-mcp && npm install && npm run build)
(cd lib/playwright-cli && npm install)

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

## License

MIT
