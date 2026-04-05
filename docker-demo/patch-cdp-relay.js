// Patch cdpRelay.js to support Target.createTarget in extension mode.
// In extension mode, Target.createTarget is not properly handled - the extension
// doesn't know about new tabs created this way and won't forward their CDP events.
// Fix: intercept Target.createTarget and use the extension's createTab command instead,
// which properly attaches the debugger and registers the tab for event forwarding.
const fs = require('fs');

const file = '/app/node_modules/playwright-core/lib/tools/mcp/cdpRelay.js';
let src = fs.readFileSync(file, 'utf8');

// 1. Add _tabSessions map initialization in constructor
const ctorInit = `    this._playwrightConnection = null;
    this._extensionConnection = null;
    this._nextSessionId = 1;`;
const ctorReplacement = `    this._playwrightConnection = null;
    this._extensionConnection = null;
    this._nextSessionId = 1;
    this._tabSessions = new Map(); // pw sessionId -> tabId for playwright tabs
    this._reverseTabSessions = new Map(); // tabId -> pw sessionId`;
if (!src.includes(ctorInit)) {
  console.error('ERROR: Could not find constructor init in cdpRelay.js');
  process.exit(1);
}
src = src.replace(ctorInit, ctorReplacement);

// 2. Intercept Target.createTarget in _handleCDPCommand
const targetGetTargetInfo = `      case "Target.getTargetInfo": {
        return this._connectedTabInfo?.targetInfo;
      }
    }
    return await this._forwardToExtension(method, params, sessionId);`;
const targetGetTargetInfoReplacement = `      case "Target.getTargetInfo": {
        return this._connectedTabInfo?.targetInfo;
      }
      case "Target.createTarget": {
        if (sessionId)
          break;
        // Use extension createTab command to properly create and register the new tab
        const { tabId, targetInfo } = await this._extensionConnection.send("createTab", { url: params.url ?? "about:blank" });
        const newSessionId = \`pw-tab-\${this._nextSessionId++}\`;
        this._tabSessions.set(newSessionId, tabId);
        this._reverseTabSessions.set(tabId, newSessionId);
        debugLogger("Created playwright tab via extension, tabId:", tabId, "sessionId:", newSessionId);
        // Send Target.attachedToTarget BEFORE returning response so Playwright processes it first
        this._sendToPlaywright({
          method: "Target.attachedToTarget",
          params: {
            sessionId: newSessionId,
            targetInfo: { ...targetInfo, type: "page", attached: true },
            waitingForDebugger: false
          }
        });
        return { targetId: targetInfo.targetId };
      }
    }
    return await this._forwardToExtension(method, params, sessionId);`;
if (!src.includes(targetGetTargetInfo)) {
  console.error('ERROR: Could not find Target.getTargetInfo case in cdpRelay.js');
  process.exit(1);
}
src = src.replace(targetGetTargetInfo, targetGetTargetInfoReplacement);

// 3. Fix _forwardToExtension to route commands to the correct tab
const forwardToExtension = `  async _forwardToExtension(method, params, sessionId) {
    if (!this._extensionConnection)
      throw new Error("Extension not connected");
    if (this._connectedTabInfo?.sessionId === sessionId)
      sessionId = void 0;
    return await this._extensionConnection.send("forwardCDPCommand", { sessionId, method, params });
  }`;
const forwardToExtensionReplacement = `  async _forwardToExtension(method, params, sessionId) {
    if (!this._extensionConnection)
      throw new Error("Extension not connected");
    // Check if this sessionId belongs to a playwright tab (created via Target.createTarget)
    const tabId = this._tabSessions.get(sessionId);
    if (tabId !== void 0) {
      return await this._extensionConnection.send("forwardCDPCommand", { tabId, sessionId: void 0, method, params });
    }
    if (this._connectedTabInfo?.sessionId === sessionId)
      sessionId = void 0;
    return await this._extensionConnection.send("forwardCDPCommand", { sessionId, method, params });
  }`;
if (!src.includes(forwardToExtension)) {
  console.error('ERROR: Could not find _forwardToExtension in cdpRelay.js');
  process.exit(1);
}
src = src.replace(forwardToExtension, forwardToExtensionReplacement);

// 4. Fix _handleExtensionMessage to route events from playwright tabs correctly
const handleExtMsg = `  _handleExtensionMessage(method, params) {
    switch (method) {
      case "forwardCDPEvent":
        const sessionId = params.sessionId || this._connectedTabInfo?.sessionId;
        this._sendToPlaywright({
          sessionId,
          method: params.method,
          params: params.params
        });
        break;
    }
  }`;
const handleExtMsgReplacement = `  _handleExtensionMessage(method, params) {
    switch (method) {
      case "forwardCDPEvent": {
        let sessionId = params.sessionId;
        // If event is from a playwright tab, use the pw sessionId for that tab
        if (params.tabId !== void 0) {
          const pwSessionId = this._reverseTabSessions.get(params.tabId);
          if (pwSessionId)
            sessionId = pwSessionId;
        }
        if (!sessionId)
          sessionId = this._connectedTabInfo?.sessionId;
        this._sendToPlaywright({
          sessionId,
          method: params.method,
          params: params.params
        });
        break;
      }
    }
  }`;
if (!src.includes(handleExtMsg)) {
  console.error('ERROR: Could not find _handleExtensionMessage in cdpRelay.js');
  process.exit(1);
}
src = src.replace(handleExtMsg, handleExtMsgReplacement);

fs.writeFileSync(file, src);
console.log('Patched cdpRelay.js: Target.createTarget now uses extension createTab command.');

// 8. Patch extensionContextFactory.js to use IPv4 (127.0.0.1) instead of localhost (::1)
// Node.js 22 resolves 'localhost' to ::1 (IPv6), but Chromium may not connect to IPv6 loopback
// reliably when spawned as a detached process. Using 127.0.0.1 ensures Chrome can reach the relay.
const factoryFile = '/app/node_modules/playwright-core/lib/tools/mcp/extensionContextFactory.js';
let factorySrc = fs.readFileSync(factoryFile, 'utf8');

const oldStartHttpServer = `await (0, import_network.startHttpServer)(httpServer, {});`;
const newStartHttpServer = `await (0, import_network.startHttpServer)(httpServer, { host: "127.0.0.1" });`;
if (!factorySrc.includes(oldStartHttpServer)) {
  console.error('ERROR: Could not find startHttpServer call in extensionContextFactory.js');
  process.exit(1);
}
factorySrc = factorySrc.replace(oldStartHttpServer, newStartHttpServer);
fs.writeFileSync(factoryFile, factorySrc);
console.log('Patched extensionContextFactory.js: relay server now listens on 127.0.0.1 (IPv4).');
