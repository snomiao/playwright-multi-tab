# playwright-multi-tab — Demo Video Script

## Video Overview

- **Title**: Let AI agents control your existing Chrome — playwright-multi-tab
- **Target length**: ~5–8 minutes
- **Format**: Screen recording + slide narration
- **Audience**: Developers using AI coding agents (Claude Code, Cursor, etc.)

---

## Slide-by-Slide Script

### Slide 1 — Title

> "Today I want to show you playwright-multi-tab — a fork of Playwright that lets AI agents
> control your **existing Chrome browser**, with full **multi-tab support**.
> This changes how you work with coding agents completely."

---

### Slide 2 — The Problem

> "The standard Playwright launches a fresh, isolated browser every time.
> That means your agent can't see your logged-in Gmail, your GitHub session, or anything
> you already have open.
> And there's another problem: it can only control **one tab at a time**.
> So if an agent needs to research on one tab and write on another — it can't."

---

### Slide 3 — What playwright-multi-tab Solves

> "This project solves three things:
> First, it connects to **your already-running Chrome** — no re-login.
> Second, the agent can open and switch between **multiple tabs in one session**.
> Third, you can run **multiple independent sessions** in parallel using the `-s` flag."

---

### Slide 4 — Architecture

> "The repo is a monorepo with three submodules.
> `lib/playwright` is a patched Playwright core.
> `lib/playwright-cli` is the CLI tool — `playwright-cli-multi-tab` — optimized for agents.
> `lib/playwright-mcp` contains the MCP server and a Chrome extension called Playwright MCP Bridge,
> which creates a WebSocket relay between the CLI and your browser."

---

### Slide 5 — Setup in 4 Steps

> "Setup takes about 5 minutes.
> Clone the repo with `--recurse-submodules`.
> Build each submodule.
> Link the CLI globally with `npm link`.
> Then load the Chrome extension from the `dist` folder via `chrome://extensions` in Developer mode."

**[Show terminal demo]**

```bash
git clone --recurse-submodules https://github.com/snomiao/playwright-multi-tab.git
cd playwright-multi-tab/tree/main
(cd lib/playwright && npm install && npm run build)
(cd lib/playwright-mcp && npm install && npm run build)
(cd lib/playwright-cli && npm install && npm link)
```

---

### Slide 6 — Feature 1: Connect to Existing Chrome

> "Once the extension is installed, just run:"

```bash
playwright-cli-multi-tab open --extension
```

> "This opens a special `connect.html` tab — tab 0 — in your Chrome.
> This tab maintains the WebSocket relay. **Don't close it.**
> To skip the approval dialog, set your extension token as an environment variable."

```bash
PLAYWRIGHT_MCP_EXTENSION_TOKEN=<your-token> playwright-cli-multi-tab open --extension
```

---

### Slide 7 — Feature 2: Multi-Tab Control

> "Now the agent can open and control multiple tabs:"

```bash
playwright-cli-multi-tab tab-new
playwright-cli-multi-tab goto https://github.com

playwright-cli-multi-tab tab-new
playwright-cli-multi-tab goto https://wikipedia.org

playwright-cli-multi-tab tab-list
# → 0: connect.html, 1: GitHub, 2: Wikipedia

playwright-cli-multi-tab tab-select 1
playwright-cli-multi-tab snapshot
```

> "The `snapshot` command returns the accessibility tree — no screenshot needed.
> This is key for **token efficiency** in agents."

---

### Slide 8 — Feature 3: Multiple Sessions

> "The `-s` flag isolates sessions completely."

```bash
playwright-cli-multi-tab -s=browser1 open --extension
playwright-cli-multi-tab -s=browser2 open --extension

playwright-cli-multi-tab -s=browser1 goto https://github.com
playwright-cli-multi-tab -s=browser2 goto https://rust-lang.org

playwright-cli-multi-tab -s=browser1 tab-list  # → GitHub tabs only
playwright-cli-multi-tab -s=browser2 tab-list  # → Rust tabs only
```

> "This lets you run two completely independent agents at the same time —
> one per browser context."

---

### Slide 9 — Agent Workflow Demo

> "Here's my actual workflow with Claude Code:"

**[Live screen recording]**

1. Start Chrome with the extension installed
2. In Claude Code: tell the agent to run `playwright-cli-multi-tab open --extension`
3. Agent opens tabs for each sub-task
4. Agent switches tabs to gather context from different sites
5. Agent reads `snapshot` output — no screenshots, no expensive vision calls
6. Agent writes output based on multi-tab research

> "The agent is doing real browser work inside **your** browser — with your cookies, your sessions,
> everything already logged in."

---

### Slide 10 — Usage Examples

**Example A — Research + Write**
```
Tab 1: Google Scholar (research)
Tab 2: Local markdown editor (writing)
Agent reads tab 1, switches to tab 2, writes summary
```

**Example B — Code Review**
```
Tab 1: GitHub PR diff
Tab 2: Local dev server (http://localhost:3000)
Agent checks the PR, opens the server, compares behavior
```

**Example C — Parallel Agents**
```
session browser1: frontend agent → Tab 1: React docs, Tab 2: component preview
session browser2: backend agent → Tab 1: API docs, Tab 2: Postman-equivalent
```

---

### Slide 11 — Why CLI over MCP?

> "You might ask: why CLI instead of MCP?
> MCP loads large tool schemas into the model's context window.
> For coding agents working in tight contexts, that's expensive.
> The CLI has zero schema overhead — just simple command strings.
> Easier to script, easier to compose, and much cheaper per call."

---

### Slide 12 — Get Started

> "Everything is on GitHub at `github.com/snomiao/playwright-multi-tab`.
> Clone it, build it, link it, install the extension, and run `open --extension`.
> Then just tell your agent it can use `playwright-cli-multi-tab` commands.
> That's it."

---

## Recording Checklist

- [ ] Terminal font size ≥ 18px for readability
- [ ] Chrome window clearly visible with extension icon
- [ ] Show tab bar when switching tabs
- [ ] Zoom in on CLI output for key commands
- [ ] Show `tab-list` output clearly (tab index + URL)
- [ ] Use `PLAYWRIGHT_MCP_EXTENSION_TOKEN` to skip approval dialog during recording
- [ ] Background music: ambient/lo-fi, low volume

## Export Notes

- Resolution: 1920×1080
- Canva presentation URL: see `./tmp/canva-candidates.json`
