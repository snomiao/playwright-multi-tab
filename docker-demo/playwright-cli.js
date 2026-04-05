#!/usr/bin/env node
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Workspace-local session storage: if .playwright/ marker exists in the project tree,
// store session files there instead of the global cache directory.
const _path = require('path');
const _fs = require('fs');
function _findWorkspaceDir(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (_fs.existsSync(_path.join(dir, '.playwright'))) return dir;
    const parent = _path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}
const _wsDir = _findWorkspaceDir(process.cwd());
if (_wsDir && !process.env.PLAYWRIGHT_DAEMON_SESSION_DIR)
  process.env.PLAYWRIGHT_DAEMON_SESSION_DIR = _path.join(_wsDir, '.playwright', 'sessions');

// Patch help text to use the actual invoked command name instead of hardcoded "playwright-cli".
// All help output goes through console.log, so a single interception covers everything.
const _cmdName = _path.basename(process.argv[1] || 'playwright-cli').replace(/\.(js|mjs|cjs)$/, '');
if (_cmdName !== 'playwright-cli') {
  const _origLog = console.log;
  console.log = (...args) => _origLog(...args.map(a => typeof a === 'string' ? a.replaceAll('playwright-cli', _cmdName) : a));
}

require('playwright-core/lib/tools/cli-client/cli');
