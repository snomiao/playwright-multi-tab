# Video Outline — playwright-multi-tab

## Structure (12 slides)

| # | Title | Key Message | Duration |
|---|-------|-------------|----------|
| 1 | playwright-multi-tab | Hook: AI agents + your Chrome | 20s |
| 2 | The Problem | Isolated browser, single tab limitation | 30s |
| 3 | What it Solves | 3 capabilities overview | 30s |
| 4 | Architecture | 3 submodules diagram | 40s |
| 5 | Setup in 4 Steps | Clone → Build → Link → Extension | 45s |
| 6 | Feature 1: Connect to Existing Chrome | --extension flag, token, tab 0 | 50s |
| 7 | Feature 2: Multi-Tab Control | tab-new, goto, tab-list, tab-select, snapshot | 60s |
| 8 | Feature 3: Multiple Sessions | -s flag, parallel isolation | 45s |
| 9 | Agent Workflow Demo | Live Claude Code demo | 90s |
| 10 | Usage Examples | 3 real scenarios | 60s |
| 11 | Why CLI over MCP? | Token efficiency argument | 30s |
| 12 | Get Started | GitHub URL + call to action | 20s |

**Total estimated length: ~8 minutes**

## Key Commands to Demo

```bash
# Connect to existing Chrome
PLAYWRIGHT_MCP_EXTENSION_TOKEN=xxx playwright-cli-multi-tab open --extension

# Multi-tab workflow
playwright-cli-multi-tab tab-new
playwright-cli-multi-tab goto https://github.com
playwright-cli-multi-tab tab-new
playwright-cli-multi-tab goto https://wikipedia.org
playwright-cli-multi-tab tab-list
playwright-cli-multi-tab tab-select 1
playwright-cli-multi-tab snapshot

# Multi-session
playwright-cli-multi-tab -s=browser1 open --extension
playwright-cli-multi-tab -s=browser2 open --extension
playwright-cli-multi-tab -s=browser1 tab-list
playwright-cli-multi-tab -s=browser2 tab-list
```

## Canva Presentation

Generated via Canva MCP — see `./tmp/canva-candidates.json` for candidate links.
