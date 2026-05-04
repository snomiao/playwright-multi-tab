# Troubleshooting

## Extension connection timeout

```
Extension connection timeout. Make sure the "Playwright MCP Bridge" extension is installed.
```

- Ensure you have loaded the **custom** extension from `lib/playwright-mcp/packages/extension/dist` (not the official one from Chrome Web Store).
- Open `chrome://extensions` and verify the extension is enabled.
- The extension ID should be `bfdoafdagnmdcgohpbjobdppiokejjdi`.

## Session disconnects unexpectedly

When using `--extension` mode, a connection page (`chrome-extension://.../connect.html`) opens as tab 0. This page maintains the WebSocket relay between the CLI and the browser. **Closing this tab will disconnect the session.**

If the session disconnects, simply re-run:

```bash
playwright-cli-multi-tab open --extension
```

## `ERR_PACKAGE_PATH_NOT_EXPORTED`

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './lib/tools/cli-client/cli' is not defined by "exports"
```

This means `lib/playwright-cli` is still resolving the npm-installed `playwright`/`playwright-core` packages instead of the locally built fork. Re-link the local packages:

```bash
(cd lib/playwright/packages/playwright-core && npm link)
(cd lib/playwright/packages/playwright && npm link)
(cd lib/playwright-cli && npm link playwright-core playwright)
(cd lib/playwright-cli && npm link)
```

You can confirm the CLI resolves the local fork with:

```bash
(cd lib/playwright-cli && node -p "require.resolve('playwright-core/package.json')")
```

Expected output:

```text
.../lib/playwright/packages/playwright-core/package.json
```

## CLI connects to the official extension instead of the custom one

If the browser opens `chrome-extension://mmlmfjhmonkocbjadbfplnigmagldckm/...` (official extension ID), the local playwright build is not being used. Follow the re-linking steps above to ensure the CLI resolves to the patched `playwright-core`.

The custom extension ID is `bfdoafdagnmdcgohpbjobdppiokejjdi`.

## Browser closes immediately

The browser process may exit if no commands are sent within the timeout window. Keep the CLI session active or use a persistent session:

```bash
playwright-cli-multi-tab open --extension
# Then run commands in separate terminal invocations
playwright-cli-multi-tab tab-list
```
