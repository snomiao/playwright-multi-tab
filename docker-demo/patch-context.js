// Patch playwright-core for extension mode compatibility.
// Fixes two related race conditions where async events fire after await resolves.

const fs = require('fs');

// ── Patch 1: context.js newTab() ─────────────────────────────────────────────
// In extension mode, _onPageCreated fires async after newPage() resolves,
// causing _tabs.find() to return undefined.
{
  const file = '/app/node_modules/playwright-core/lib/tools/backend/context.js';
  let src = fs.readFileSync(file, 'utf8');

  const original = `  async newTab() {
    const browserContext = await this.ensureBrowserContext();
    const page = await browserContext.newPage();
    this._currentTab = this._tabs.find((t) => t.page === page);
    return this._currentTab;
  }`;

  const replacement = `  async newTab() {
    const browserContext = await this.ensureBrowserContext();
    const page = await browserContext.newPage();
    // Extension mode: _onPageCreated may fire async after newPage() resolves.
    // Poll until the tab is registered, then fall back to manual registration.
    let tab = this._tabs.find((t) => t.page === page);
    if (!tab) {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 50));
        tab = this._tabs.find((t) => t.page === page);
        if (tab) break;
      }
    }
    if (!tab) {
      this._onPageCreated(page);
      tab = this._tabs.find((t) => t.page === page);
    }
    this._currentTab = tab;
    return this._currentTab;
  }`;

  if (!src.includes(original)) {
    console.error('ERROR: Could not find newTab() body in context.js to patch.');
    process.exit(1);
  }

  src = src.replace(original, replacement);
  fs.writeFileSync(file, src);
  console.log('Patched context.js: newTab() now waits for _onPageCreated in extension mode.');
}

// ── Patch 2: crBrowser.js doCreateNewPage() ──────────────────────────────────
// In extension mode, Target.targetCreated event fires async after
// Target.createTarget response, so _crPages.get(targetId) returns undefined.
{
  const file = '/app/node_modules/playwright-core/lib/server/chromium/crBrowser.js';
  let src = fs.readFileSync(file, 'utf8');

  const original = `  async doCreateNewPage() {
    const { targetId } = await this._browser._session.send("Target.createTarget", { url: "about:blank", browserContextId: this._browserContextId });
    return this._browser._crPages.get(targetId)._page;
  }`;

  const replacement = `  async doCreateNewPage() {
    const { targetId } = await this._browser._session.send("Target.createTarget", { url: "about:blank", browserContextId: this._browserContextId });
    // Extension mode: Target.targetCreated event may fire async after createTarget response.
    // Poll until _crPages has the entry for this targetId.
    let crPage = this._browser._crPages.get(targetId);
    if (!crPage) {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 50));
        crPage = this._browser._crPages.get(targetId);
        if (crPage) break;
      }
    }
    if (!crPage)
      throw new Error(\`Extension mode: target \${targetId} not found in _crPages after waiting\`);
    return crPage._page;
  }`;

  if (!src.includes(original)) {
    console.error('ERROR: Could not find doCreateNewPage() body in crBrowser.js to patch.');
    process.exit(1);
  }

  src = src.replace(original, replacement);
  fs.writeFileSync(file, src);
  console.log('Patched crBrowser.js: doCreateNewPage() now waits for Target.targetCreated in extension mode.');
}
